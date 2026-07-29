#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const HANDOFF_HEADER = `# Automated cross-agent handoff

This is the single rolling communication record for Claude, Codex, and Kimi.
Lifecycle hooks maintain it; do not create a new handoff file after each turn.
Read the newest entry together with the live Git status and diff. Repository
files and test output are authoritative when this summary becomes stale.

Default route:
\`Claude design → Codex plan/code → Kimi QA → Codex fixes ↔ Kimi retest\`

Hook setup:

- Claude and Codex use the version-controlled project hooks.
- After installing Kimi Code CLI, run
  \`npm run agent:handoff:install-kimi\` once for its user-level Stop hook.
- Kimi's Stop payload contains a session id rather than its final text; the
  hook exports that local session and records its newest \`Handoff:\` report.
- Run \`npm run agent:handoff\` to inspect this record.

## Recent handoffs
`;

const ENTRY_START = "<!-- agent-handoff:entry:start -->";
const ENTRY_END = "<!-- agent-handoff:entry:end -->";
const MAX_ENTRIES = 9;
const MAX_SUMMARY_CHARS = 16_000;
const KIMI_HOOK_START = "# portfolio3.0-agent-handoff-hook:start";
const KIMI_HOOK_END = "# portfolio3.0-agent-handoff-hook:end";
const VALID_AGENTS = new Set(["claude", "codex", "kimi"]);

function fail(message) {
  process.stderr.write(`agent-handoff: ${message}\n`);
  process.exitCode = 1;
}

function runGit(args, cwd, fallback = "") {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    }).trimEnd();
  } catch {
    return fallback;
  }
}

function repositoryRoot(cwd) {
  const root = runGit(["rev-parse", "--show-toplevel"], cwd);
  if (!root) {
    throw new Error(`not inside a Git repository: ${cwd}`);
  }
  return root;
}

function readStdin() {
  return new Promise((resolveInput, rejectInput) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => resolveInput(input));
    process.stdin.on("error", rejectInput);
  });
}

function parsePayload(input) {
  if (!input.trim()) return {};
  try {
    return JSON.parse(input);
  } catch {
    return {};
  }
}

function sanitizeSummary(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  return value
    .trim()
    .replaceAll(ENTRY_START, "<!-- handoff marker removed -->")
    .replaceAll(ENTRY_END, "<!-- handoff marker removed -->")
    .slice(0, MAX_SUMMARY_CHARS);
}

function normalizeSummary(payload) {
  const candidates = [
    payload.last_assistant_message,
    payload.final_response,
    payload.response,
    payload.message,
  ];
  const value = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim(),
  );
  return sanitizeSummary(value);
}

function kimiHomePath() {
  return process.env.KIMI_CODE_HOME
    ? resolve(process.env.KIMI_CODE_HOME)
    : join(homedir(), ".kimi-code");
}

/**
 * Kimi's Stop payload exposes a session id but not the final assistant text.
 * Export the local session and recover the newest completed assistant step
 * carrying a `Handoff:` report. This keeps QA read-only while still relaying
 * its evidence into the repository-backed rolling handoff.
 */
function extractKimiSummary(payload, root) {
  const sessionId = String(payload.session_id ?? "");
  if (!/^session_[A-Za-z0-9-]+$/.test(sessionId)) return "";

  const bundledKimi = join(kimiHomePath(), "bin", "kimi");
  const executable = existsSync(bundledKimi) ? bundledKimi : "kimi";
  const archive = join(
    tmpdir(),
    `portfolio3-kimi-handoff-${process.pid}-${Date.now()}.zip`,
  );

  try {
    execFileSync(
      executable,
      [
        "export",
        sessionId,
        "--output",
        archive,
        "--yes",
        "--no-include-global-log",
      ],
      {
        cwd: root,
        encoding: "utf8",
        timeout: 7_000,
        maxBuffer: 2 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );

    const wire = execFileSync(
      "unzip",
      ["-p", archive, "agents/main/wire.jsonl"],
      {
        encoding: "utf8",
        timeout: 2_000,
        maxBuffer: 20 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );

    const textByStep = new Map();
    const completedSteps = [];
    for (const line of wire.split("\n")) {
      if (!line.trim()) continue;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }
      const event = record?.event;
      if (record?.type !== "context.append_loop_event" || !event) continue;
      const key = `${String(event.turnId)}:${String(event.step)}`;
      if (event.type === "content.part" && event.part?.type === "text") {
        const prior = textByStep.get(key) ?? "";
        textByStep.set(key, `${prior}${String(event.part.text ?? "")}`);
      }
      if (event.type === "step.end" && event.finishReason === "end_turn") {
        completedSteps.push(key);
      }
    }

    const completedReports = completedSteps
      .map((key) => textByStep.get(key) ?? "")
      .filter((text) => text.trim());
    const allReports = [...textByStep.values()].filter((text) => text.trim());
    const substantive = [...completedReports]
      .reverse()
      .find((text) => /(^|\n)\s*Handoff:/i.test(text));
    return sanitizeSummary(
      substantive ??
        completedReports.at(-1) ??
        allReports.at(-1) ??
        "",
    );
  } catch {
    return "";
  } finally {
    if (existsSync(archive)) {
      try {
        unlinkSync(archive);
      } catch {
        // Best-effort cleanup in the OS temporary directory.
      }
    }
  }
}

function snapshot(root) {
  const rawStatus = runGit(
    ["status", "--short", "--untracked-files=all"],
    root,
    "(git status unavailable)",
  );
  const status = rawStatus
    .split("\n")
    .filter((line) => line && !line.endsWith("docs/agent-handoff.md"))
    .join("\n");
  const numstat = runGit(
    [
      "diff",
      "--no-ext-diff",
      "--numstat",
      "--",
      ".",
      ":(exclude)docs/agent-handoff.md",
    ],
    root,
  );
  const digest = createHash("sha256")
    .update(`${status}\n${numstat}`)
    .digest("hex")
    .slice(0, 12);

  return {
    branch: runGit(["branch", "--show-current"], root, "(detached)"),
    head: runGit(["rev-parse", "--short", "HEAD"], root, "(no HEAD)"),
    status: status || "(clean apart from the handoff record)",
    digest,
  };
}

function existingEntries(markdown) {
  const pattern = new RegExp(`${ENTRY_START}[\\s\\S]*?${ENTRY_END}`, "g");
  return markdown.match(pattern) ?? [];
}

function quoteBlock(text) {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function handoffEntry({ agent, payload, state, summary }) {
  const timestamp = new Date().toISOString();
  const session = String(payload.session_id ?? "not exposed");
  const turn = String(payload.turn_id ?? "not exposed");
  const model = String(payload.model ?? "not exposed");
  const finalReport =
    summary ||
    "The client hook did not expose the final assistant report. Inspect the " +
      "Git status below and the originating session before accepting the handoff.";

  return `${ENTRY_START}
### ${timestamp} · ${agent}

- Branch / HEAD: \`${state.branch}\` / \`${state.head}\`
- Worktree snapshot: \`${state.digest}\`
- Session / turn: \`${session}\` / \`${turn}\`
- Model: \`${model}\`

#### Final report

${quoteBlock(finalReport)}

#### Git status at handoff

\`\`\`text
${state.status}
\`\`\`
${ENTRY_END}`;
}

function writeAtomically(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, content, "utf8");
  renameSync(temporary, path);
}

async function capture(agent) {
  if (!VALID_AGENTS.has(agent)) {
    throw new Error(`--agent must be one of: ${[...VALID_AGENTS].join(", ")}`);
  }

  const payload = parsePayload(await readStdin());
  const root = repositoryRoot(payload.cwd || process.cwd());
  const path = join(root, "docs", "agent-handoff.md");
  const current = existsSync(path) ? readFileSync(path, "utf8") : HANDOFF_HEADER;
  const exposedSummary = normalizeSummary(payload);
  const summary =
    exposedSummary || (agent === "kimi" ? extractKimiSummary(payload, root) : "");
  const state = snapshot(root);
  const entries = existingEntries(current);
  const latestDigest = entries[0]?.match(/Worktree snapshot: `([^`]+)`/)?.[1];

  // Capture substantive final reports. Also capture the first changed snapshot
  // so a client with a sparse Stop payload still leaves useful Git evidence.
  const hasHandoffReport = /(^|\n)\s*Handoff:/i.test(summary);
  const snapshotChanged = latestDigest !== state.digest;
  if (!hasHandoffReport && !snapshotChanged) return;

  const entry = handoffEntry({ agent, payload, state, summary });
  const dedupeKey = createHash("sha256").update(entry).digest("hex");
  const deduped = entries.filter(
    (existing) =>
      createHash("sha256").update(existing).digest("hex") !== dedupeKey,
  );
  const nextEntries = [entry, ...deduped].slice(0, MAX_ENTRIES);
  writeAtomically(path, `${HANDOFF_HEADER}\n${nextEntries.join("\n\n")}\n`);
}

function show() {
  const root = repositoryRoot(process.cwd());
  const path = join(root, "docs", "agent-handoff.md");
  process.stdout.write(
    existsSync(path) ? readFileSync(path, "utf8") : `${HANDOFF_HEADER}\n`,
  );
}

function kimiConfigPath() {
  return join(kimiHomePath(), "config.toml");
}

function kimiHookBlock(scriptPath) {
  const escapedPath = scriptPath.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return `${KIMI_HOOK_START}
[[hooks]]
event = "Stop"
command = "node \\"${escapedPath}\\" capture --agent kimi"
timeout = 10
${KIMI_HOOK_END}`;
}

function hasKimiHandoffHook(content) {
  return (
    content.includes("scripts/agent-handoff.mjs") &&
    content.includes("capture --agent kimi")
  );
}

function stripKimiHandoffHook(content) {
  const lines = content.split("\n");
  const kept = [];
  for (let index = 0; index < lines.length; ) {
    const line = lines[index] ?? "";
    if (line.trim() === KIMI_HOOK_START) {
      index += 1;
      while (index < lines.length && lines[index]?.trim() !== KIMI_HOOK_END) {
        index += 1;
      }
      if (index < lines.length) index += 1;
      continue;
    }
    if (line.trim() === "[[hooks]]") {
      let end = index + 1;
      while (end < lines.length && !lines[end]?.trimStart().startsWith("[")) {
        end += 1;
      }
      const block = lines.slice(index, end).join("\n");
      if (hasKimiHandoffHook(block)) {
        index = end;
        continue;
      }
    }
    kept.push(line);
    index += 1;
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

function installKimiHook() {
  const root = repositoryRoot(process.cwd());
  const configPath = kimiConfigPath();
  const current = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  // Kimi may reserialize config.toml and drop comments, so detect the
  // command itself rather than relying only on our marker comments.
  if (hasKimiHandoffHook(current)) {
    process.stdout.write(`Kimi handoff hook already installed in ${configPath}\n`);
    return;
  }

  const block = kimiHookBlock(join(root, "scripts", "agent-handoff.mjs"));
  const separator = current && !current.endsWith("\n") ? "\n\n" : current ? "\n" : "";
  writeAtomically(configPath, `${current}${separator}${block}\n`);
  process.stdout.write(`Installed Kimi handoff hook in ${configPath}\n`);
}

function uninstallKimiHook() {
  const configPath = kimiConfigPath();
  if (!existsSync(configPath)) {
    process.stdout.write("Kimi config does not exist; nothing to remove.\n");
    return;
  }

  const current = readFileSync(configPath, "utf8");
  if (!hasKimiHandoffHook(current)) {
    process.stdout.write("Kimi handoff hook is not installed.\n");
    return;
  }

  writeAtomically(configPath, `${stripKimiHandoffHook(current)}\n`);
  process.stdout.write(`Removed Kimi handoff hook from ${configPath}\n`);
}

const [command = "show", ...args] = process.argv.slice(2);

try {
  if (command === "capture") {
    const agentIndex = args.indexOf("--agent");
    const agent = agentIndex >= 0 ? args[agentIndex + 1] : "";
    await capture(agent);
  } else if (command === "show") {
    show();
  } else if (command === "install-kimi-hook") {
    installKimiHook();
  } else if (command === "uninstall-kimi-hook") {
    uninstallKimiHook();
  } else {
    fail(
      "usage: agent-handoff.mjs " +
        "[show|capture --agent claude|codex|kimi|" +
        "install-kimi-hook|uninstall-kimi-hook]",
    );
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
