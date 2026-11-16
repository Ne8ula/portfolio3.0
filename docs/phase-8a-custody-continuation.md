# Phase 8A — custody-review continuation (OD-R1-C1 · prospective · not executed)

**Status: prepared 2026-10-27 by `portfolio-design` (documentation only) at
the owner's direction. Not executed. No evidence was collected, no reviewer
was started, and no permission, setting, candidate or evidence byte was
changed while this was written.** This amendment adds a method only. The
session that writes or aligns it cannot act on it. It does not approve
anything new. The OD-R1 decision record stays in
`docs/phase-8a-recovery-plan.md` §6; this file adds no owner checkpoint,
content approval or acceptance record.

**Provenance (agent-transcribed, not signatures).** After the BLOCKED
custody report, the owner wrote: "I authorize a separately scoped
continuation to complete that review." The owner then directed: "Prepare a
narrow custody-review continuation amendment using fixed trusted-host
Git-inventory and preview-continuity evidence. Preserve independent Codex
verification, all existing evidence, and current permissions. Align
instructions and stop for a new compatible session. No engineering,
commits, or acceptance."

`R` = `C:/Users/alexx/Documents/portfolio3.0-phase8a-recovery`.

## 1. What already happened (fixed; not reopened)

- Route B reconstructed `R/phase8a-candidate-r2` from local `main` at
  `bfa8d8234fd698c8053fd9915a91b8ceeb5bd04e`. It has exactly 38 transfers and
  807 source paths. Source SHA-256 is
  `dd898aaa38b06bb37e19e001bb1c757cebe25effec96611c1cd28e0afef532cc`. The
  new raw-index baseline is
  `3bcd2e3f03d9b41fca519ec7de1066ca0a7c0f17d213a0333865ef868378827d`, and
  its bytes are retained in `R/candidate-r2-transfer-evidence/new-container-index.bin`.
- Fresh Codex custody session `01a17f3d-ce40-7c32-b055-4a43cc95a48a`
  returned **BLOCKED** (report SHA-256 `62e8e461…b384`). Two checks were
  denied. (1) The primary source-membership query `git ls-files` exited 128
  with "dubious ownership" under CodexSandboxOffline. (2) The preview
  listener query `Get-NetTCPConnection` was denied with `0x80041003`. As a
  result, RB-7 and RB-7L were not independently completed.
- The host's post-review preservation checks passed. They did **not**
  replace independent review, and they are not final QA.
- The historical index gap
  `fdce5bcf4e02f3b42b4bdc7fcf85297badb051102300b1dcd9705d311eedd896` →
  `0c27b84cf18f27a14ac43261bb2991dfa3c55916239d5e95c78ae1ed87ea0737` is
  still **unexplained**. It is never reconciled or accepted, and every
  report must disclose it.

Nothing here fixes, waives or reinterprets either denial. The original
BLOCKED report stays BLOCKED, and no earlier result becomes PASS. The
continuation produces its own separate verdict.

## 2. Narrow supersession

The rule in recovery plan §3.1 and §3.4, `docs/phase-8-design.md` §10 and the
orchestrator profile says that a denied action "stops and is not retried by
another route". That rule is superseded **only** for this named future
procedure:

1. the fixed trusted-host collection in §5 and §6 below, run by the host
   (orchestrator) under the owner's ordinary existing permissions; and
2. exactly one fresh read-only Codex judgment of that evidence (§7).

The supersession does **not** apply to:

- the session that writes or aligns this document;
- any other command, tool, retry, fallback probe or reviewer;
- any later custody attempt.

The reviewer never re-runs either denied command class. The host provides
that evidence as fixed records, and the reviewer judges it. This follows
the existing trusted-controller pattern (`docs/codex-qa-proposal.md` §4):
fixed host commands supply evidence that the sandbox cannot produce, and a
separate read-only session verifies it.

## 3. Preconditions (all required; otherwise do not start)

1. A **new** compatible orchestrator session whose loaded instructions
   include the aligned files. Before starting, it compares the hashes of
   those files against the orchestrator's stored alignment-verification
   record. That record is the after-record under
   `R/od-r1-custody-continuation-alignment-2026-10-27/after.json`, cited by path and
   SHA-256 in the operational handoff.
2. The owner starts this specific review-only task in that session. A
   resumed, forked, or editing session is not eligible.
3. The path `R/candidate-r2-custody-continuation-evidence` (`E`) is absent
   at the start. If it exists, stop. The session never writes into
   `R/candidate-r2-transfer-evidence` or any other existing directory.
4. Phase command `status` only. No other phase command runs.
5. The host identity is the owner's normal account and the process is
   **not elevated**. Record the token name and elevation flag; if the
   process is elevated, stop. No trust, `safe.directory`, ACL, ownership,
   settings, hook or sandbox change is made, and nothing is elevated or
   bypassed.

**Historical preflight blocker (before this amendment).** The host documentation-only check found a
later change to `.claude/agents/portfolio-design.md` and ten added loose
Git objects against the earlier alignment-before record; existing Git files
were unchanged. Those differences are outside §5's source/Git allowance and
block continuation. The orchestrator records the exact verification evidence.
This alignment neither expands the allowance nor authorizes accepting,
erasing or relabeling those differences PASS; it is not execution readiness.

**Prospective accounting scope (agent-transcribed, not a signature,
checkpoint or approval ledger).** The owner now requested:
"Resolve existing source/Git discrepancies. Also approve and authorize for that edit."
Only the historical note's allowance statements are superseded by §5 below,
pending exact durable accounting and independent verification, not custody PASS.
Host analysis reports 19 added loose blobs versus Route B `before.json`
`primary`, no removed files and byte-identical pre-existing Git files.
Reported valid Git SHA-1 identities and lengths bind payloads to allowed
versions: exact copies, exact old/new continuation-section compositions,
and rolling handoff blocks corroborated in preserved handoffs/Route B objects.
The intermediate recovery-plan version differs only in its recorded header/
next-role edit; protected sections match. This is host explanation, not
independent QA. The command/process that created each blob is **not proven**.
The final §3 after-record, not this snapshot count, fixes the exact allowance.

## 4. Scope and preservation

- **Reuse the existing successor, read-only.** No clone, reconstruction,
  new successor, overlay refresh or import. The following stay
  byte-unchanged and are never written:
  - `R/phase8a-candidate`, except its live `.next/` per RB-7L;
  - `R/phase8a-baseline`;
  - `R/phase8a-candidate-r2`;
  - the forensic archive;
  - `R/candidate-r2-transfer-evidence`, including the original BLOCKED
    report;
  - every top-level file in `R` except the append-only
    `preview-server.log`.
- **No Git command of any kind** runs in `R/phase8a-candidate` or
  `R/phase8a-baseline`; they are read by filesystem reads and hashing
  only. In the successor, Git is read only if needed and only with
  `GIT_OPTIONAL_LOCKS=0`.
- The original thirteen-file overlay membership is unchanged. This file
  and the aligned documents are read-only inputs from the primary
  checkout. They are cited by path and SHA-256 and never copied into any
  candidate.
- Not included: engineer launch, `npm`, build, gates, browser work,
  performance work, HTTP fetches, commits, pushes, publication, checkpoint,
  replacement baseline and acceptance. All other phase scope, owner
  checkpoints and no-Kimi rules still apply.

## 5. Fixed primary host Git inventory

The commands run in `C:/Users/alexx/Documents/portfolio3.0` (the primary
checkout), under the owner's normal identity, with this environment:

- `GIT_OPTIONAL_LOCKS=0`;
- `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, `GIT_CONFIG_*` and
  `GIT_CEILING_DIRECTORIES` unset (record whether each is present);
- no `-c` options.

Run exactly these commands, in this order, and no others:

| # | argv |
|---|---|
| G0 | `git --version` |
| G1 | `git rev-parse --verify HEAD` |
| G2 | `git symbolic-ref -q HEAD` |
| G3 | `git for-each-ref --format=%(objectname) %(objecttype) %(refname)` |
| G4 | `git ls-files --cached --others --exclude-standard -z` |
| G5 | `git ls-files --stage -z` |
| G6 | `git ls-files -v -z` (assume-unchanged / skip-worktree tags) |
| G7 | `git ls-tree -r -z --full-tree HEAD` |
| G8 | `git status --porcelain=v1 -z --untracked-files=all` |

Around these commands:

1. **`.git` filesystem walk before Git (`Gfs-a`).** Before G0, walk the
   entire primary `.git` tree and record every file's path, size and
   SHA-256, plus the directory list. A reparse point stops the procedure.
2. **`.git` filesystem walk after Git (`Gfs-b`).** Repeat the walk after G8.
   `Gfs-b` must equal `Gfs-a`; this shows the inventory wrote nothing.
3. **Source hashes.** Compute SHA-256 for every path emitted by G4 (parsed
   from the raw NUL stream). Each path is checked for safety (no absolute
   path, no `..`, no reparse point). A tracked path that is missing is
   recorded, and G8 must explain it.
4. **Command records.** For each command, keep raw stdout and stderr
   unnormalized, with NUL streams byte-exact. Also keep argv, cwd, the
   environment subset above, start and end UTC timestamps, exit code, and
   the SHA-256 of each stream. Every command must exit 0. G2 may also exit
   1 on a detached HEAD; this is fixed in advance. Any other non-zero exit,
   denial, "dubious ownership" or other error **stops**. No retry,
   alternate tool or trust change follows.

**Allowed alignment delta.** The primary governing docs changed on purpose
between Route B and this continuation. Compare the fresh inventory with
the Route B primary record (`R/candidate-r2-transfer-evidence/before.json`
`primary`, unchanged in `post-review-preservation.json`) as follows:

- **Source paths.** Only these may differ or be added:
  - `docs/phase-8a-custody-continuation.md` (new);
  - `docs/phase-8a-recovery-plan.md`;
  - `docs/phase-8-design.md`;
  - `docs/astra-orchestration.md`;
  - `.claude/agents/portfolio-orchestrator.md`;
  - `docs/agent-handoff.md`;
  - `.claude/agents/portfolio-design.md` (immutable additional primary input).

  The first five plus the design profile must equal the six fixed
  instruction/profile SHA-256 hashes in §3's final `after.json`.
  The design profile's exact current SHA-256 is
  `98dc00e58f19138706c1437f9210a1ce5a340f212b74ac0c24476974e9e0d9f9`.
  Its preserved original-candidate bytes hash to
  `95f013579513f3e6af988b836f503be35b8073e62e1aaf5c7b7f5af30c6884c9`,
  equal to Route B primary. This is the recorded owner-directed design-provider
  change; tools/scope remain documentation-only. It changes neither engineering
  model nor overlay membership; never edit it or copy it into any candidate.
  The four already-existing instruction files' preserved pre-alignment copies
  remain under
  `R/od-r1-custody-continuation-alignment-2026-10-27/before-files/`, and
  those copies must equal the Route B record. The newly added continuation
  document is recorded absent-before/present-after, with no original before-copy
  and its final SHA-256 pinned in `after.json`. The orchestrator-profile insertion
  is prospective OD-R1-C1 only; model/tools unchanged. `docs/agent-handoff.md`
  may differ only through operational entries adding no approval, checkpoint or
  content records, independently checked by the reviewer. The after-record binds
  preserved handoff versions for historical blob attribution; it must not require
  its own hash to be embedded in a byte-frozen handoff. This already-existing
  SOURCE-only allowance applies only before the review freeze: no arbitrary source
  delta, no new Git-object or other Git write exception, and no changes during
  the frozen review window.
- **Everything else.** Every other path must be byte-identical to the
  Route B record, with no additions or removals. This includes all
  product, test, tooling, content and `.claude/settings*.json` bytes.
- **`.git`.** Every pre-existing file, INCLUDING THE RAW INDEX, HEAD, refs,
  packed-refs, config, packs, logs, hooks and objects, must remain byte-identical
  to Route B; no pre-existing file or directory may disappear. Only the exact
  ADDED loose-blob paths and necessary new object-parent directories listed in
  the final `after.json` are permitted. Each blob requires compressed-byte
  SHA-256, payload SHA-256, Git object ID, length and type (`blob`), bound to
  preserved allowed document/profile/handoff versions by path and hash.
  The reviewer independently verifies those values and byte-exact payload
  attribution against raw saved source versions and preserved records; host
  explanation or similarity scores alone are not PASS. Invalid, unattributed,
  extra, missing or changed objects, or any unlisted new directory, **block**.
  G5's stage-0 entries and (mode, OID, path) equality with G7 are supplementary
  only: semantic equality never excuses raw-index or other byte drift.
  No normalization, deletion, rewrite or index reconstruction may force a match.
  This is no class-wide objects exemption and permits no arbitrary future blobs.
- **Unexplained differences.** Any unexplained or out-of-allowlist difference
  **stops**. Every source/Git difference from Route B must be accounted for by the
  final exact manifest, except only the already-existing operational-handoff
  SOURCE allowance above before the review freeze. Every later source/Git
  difference outside that fixed record blocks, subject only to that same
  pre-freeze SOURCE exception. All later unlisted Git objects, including
  hook-created objects, still block; no forward Git-write allowance and no
  relaxation during review.

**Final alignment record.** Before stopping, the orchestrator creates §3's
`after.json` once, supplying the six fixed instruction/profile hashes, exact
permitted source deltas and exact Git additions, with preserved-version bindings.
It is alignment provenance, NOT a custody verdict, replacement baseline or owner
acceptance. Historical before-records and all existing files stay preserved.
Necessary version copies and accounting reports may be new files only under
`R/od-r1-custody-continuation-alignment-2026-10-27/`, never replacements;
session scratch scripts are not copied there. This permits no review execution
in the editing session and changes none of §§4, 6–10.

Only after these checks pass does the fresh inventory become the
**continuation before-baseline**. From that point until the post-review
check, the primary source and `.git` must stay immutable. That means no
hook, handoff write, concurrent session or other change. Any drift blocks.

## 6. Fixed host preview observations (before **and** after review)

These run under ordinary existing permissions. Observations `P-before` and
`P-after` each run exactly these steps:

1. `Get-NetTCPConnection -State Listen -LocalPort 3001`. Record only
   LocalAddress, LocalPort, State, OwningProcess and CreationTime. There
   must be exactly one unique OwningProcess, `L`. Zero or several owners
   **block**.
2. `Get-Process -Id L`. Record only Id, ProcessName and StartTime.
3. `Get-CimInstance Win32_Process -Filter "ProcessId=L"`. Record only
   ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine and
   CreationDate.
4. **Bounded candidate binding.** Starting with L, stop at the first
   process that supplies the exact candidate-path binding in (a) below.
   Otherwise repeat step 3 for its observed ParentProcessId, by exact
   numeric PID filter only, for at most 4 ancestor levels. Record each
   observed link. A missing parent before binding is established, a cycle,
   a parent created later than its child (PID reuse), or exhaustion of the
   bound without candidate binding **blocks**. A ParentProcessId number
   alone is not proof of a live ancestry link. PID `51704` is queried only
   if encountered as an observed parent within this bound, never merely
   because it appears in the historical record.

Only L and those bounded ancestors are queried. Never enumerate processes
or probe environment variables. Never restart or recreate the preview.
Never browse or HTTP-fetch. Never use `netstat`, elevation or any fallback
probe. A host denial of any step **blocks**, and there is no retry.

**Binding rule.** All of the following must hold:

- (a) L itself or an observed ancestor has an ExecutablePath or an
  executable/script path argument in CommandLine rooted at exactly
  `C:\Users\alexx\Documents\portfolio3.0-phase8a-recovery\phase8a-candidate`.
  Compare complete absolute path components, not a basename, ellipsis,
  incidental text reference or substring; `phase8a-candidate-r2` is not a
  match. No observed member binds to the successor or primary checkout.
  Missing or ambiguous candidate binding **blocks**.
- (b) All observed dates must be coherent. Retain raw timestamps and their
  timezone/precision information; compare in UTC without guessed tolerance
  or clock-skew allowance. L's StartTime and CreationDate must corroborate
  the same process creation; every observed parent must be created no later
  than its child, and each listener endpoint no earlier than L's creation.
  All process start/creation dates and endpoint CreationTimes must precede
  the Route B before-snapshot (`R/candidate-r2-transfer-evidence/before.json`
  `at`). Command-observation timestamps must follow the recorded before/
  review/after order. Missing, inconsistent or unverifiable dates **block**.
- (c) `P-before` and `P-after` agree exactly on the recorded listener
  endpoint set and all recorded process fields, including L, StartTime,
  CreationDate, endpoint CreationTime, observed parent links and the exact
  candidate-path binding. The same bounded stopping rule applies to both.

The historical launcher PID `51704` and `startedAt`
(`2026-10-27T19:08:42.813Z`) in `R/preview-server.json` remain context, not
proof of current ancestry or a required timestamp lower bound. A missing
51704 alone neither proves the preview stopped nor requires a live link to
that PID. Equal log bytes alone do **not** prove continuity.

**Evidentiary limits.** These observations can establish current listener
binding to the original candidate, pre-Route-B process/endpoint creation,
and unchanged identity and binding at the review boundaries. They do not
prove descent from the historical launcher, continuity before Route B, or
uninterrupted service during unobserved intervals. The fresh reviewer must
judge whether the preserved Route B evidence together with these records
satisfies RB-7L; insufficient evidence means **BLOCKED** and return to the
owner. RB-7L is not waived or narrowed, and starting the task supplies no
missing proof.

**RB-7L snapshots** are taken before and after the review:

- the full inventory of the original candidate's `.next/` (path, size,
  mtime and SHA-256);
- `R/preview-server.log`. The SHA-256 of its first 21,249 bytes must
  equal the Route B before-record. Record the current length L0 and the
  SHA-256 of the full content. After the review, the first L0 bytes must
  hash identically: the log is append-only, with no truncation or rewrite.

Every non-live original stays immutable.

## 7. Fresh independent custody review

**Launch.**

- Exactly **one** new `codex exec` process and session, using the current
  authenticated default model.
- `--sandbox read-only`, `approval_policy` never, and its own output file
  in `E`, written by the CLI.
- The session must not be any engineer session, any prior reviewer
  (`01a17efc…`, `01a17f3d…`, engineer `01a17e5b…`), or a resume, fork or
  subagent of one.
- Identity is proven by the CLI version, the session ID and rollout
  metadata (source `exec`, sandbox, approval policy and `forked_from_id`
  null). Self-report never counts.

**Inputs.** All inputs are cited by path and SHA-256:

- the approved plan copy (`71305b786341…`);
- the current recovery plan;
- this amendment;
- `docs/phase-8-design.md`;
- `R/candidate-r2-transfer-evidence/`, read-only;
- `E`;
- read access to the original trees, the successor and the primary
  checkout.

**Tasks.** The reviewer reassesses **all** of RB-1…RB-8, including RB-7L,
from the exact evidence. It inherits no partial PASS from `01a17f3d…`. It
independently:

- rehashes all accessible original, new, source and `.git` files;
- validates every stored hash against the raw bytes;
- re-parses the NUL path sets;
- checks the command records (argv, cwd, environment subset, exit codes
  and timestamps);
- checks the alignment-delta logic and the binding logic.

Where file reads allow, it cross-checks the host's Git output against the
primary `.git` bytes, for example the index entries and refs.

**Boundaries.** The host supplies the primary Git membership and the
process observations. The reviewer does not re-run those denied command
classes and gets no new privilege. Independence means the reviewer judges
and verifies fresh host evidence; it does not mean the reviewer re-runs
every host command.

**Blocking.** Missing, incoherent or unverifiable host proof **BLOCKS**.
Earlier host preservation PASS results are not final QA. Any of the
following stops the procedure with no retry, alternate tool or route:

- a denied launch or a non-zero exit of a required command;
- missing proof or an identity mismatch;
- integrity drift;
- a blocking finding.

## 8. Evidence in `E` (new directory only)

All new evidence goes in `E`. The directory holds:

- **Command records.** Raw stdout/stderr, argv, cwd, environment subset,
  timestamps, exit codes and SHA-256 for every host command in §§5–6. No
  secrets and no full environment dump.
- **Inventories.**
  - the identity and elevation record;
  - the old-evidence hashes, covering every file in
    `candidate-r2-transfer-evidence`, plus the cited report and rollout
    hashes;
  - the `R` top-level membership and hashes;
  - before/after filesystem inventories of the originals, successor and
    forensic archive;
  - the primary before-baseline and alignment-delta record;
  - the preview observations and RB-7L snapshots.

  The only allowed `R` top-level delta from the Route B record is two new
  directories, `od-r1-custody-continuation-alignment-2026-10-27` and `E`,
  plus the append-only log.
- **Pre-review manifest.** It lists every file in `E` written so far, with
  its SHA-256, the current plan and amendment hashes, and the new exact
  source and Git fingerprints. It never lists itself, and it never changes
  after it is written. The **host launch record** seals the manifest's
  SHA-256 before the reviewer starts.
- **Review records.** Launch record, CLI stdout/stderr, output file,
  rollout copy and hash, identity record.
- **Post-review records.** After the review, the host runs the full Git
  inventory again (G0–G8), plus the `.git` walk, the source hashes,
  `P-after`, RB-7L and every preservation inventory. The repeated primary
  outputs must be byte-identical to the before-baseline. A final summary
  then records the following, all without overwriting anything:
  - the binding of verdict to identity;
  - the post-review check result;
  - the `fdce…` disclosure;
  - a not-run list.

## 9. Verdict and stop

**PASS** requires all of the following:

- a verified reviewer identity;
- every applicable custody proof green;
- a passing final host after-check, bound to the review;
- no blocking findings.

Anything else is BLOCKED. A PASS is custody only. It is not product QA and
not owner acceptance, and it does not settle the `fdce…` gap or the
shader defect. The session stops and reports to the owner whether the
result is PASS or BLOCKED. It writes the operational handoff only after the
post-review checks. No next step follows automatically: §10 items 4–5,
engineering, build, gates, AC-22…AC-25, product Codex QA and owner visual
review each still need separately directed continuation.

## 10. Remaining points for the owner

- **C-1 Untracked logs.** Untracked or runtime files that are not ignored
  in the primary checkout may change during the window, for example
  `debug.log` or files touched by concurrent sessions. Any such change
  blocks, and no exclusion is added. Pause concurrent sessions before
  starting.
- **C-2 Continuity before Route B.** The preview continuity interval
  before Route B is not proven (§6). RB-7L remains unchanged: the fresh
  reviewer must judge the evidence sufficient, otherwise report BLOCKED
  and return to the owner. Starting the task is not a waiver.
