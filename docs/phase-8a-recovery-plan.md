# Phase 8A — candidate recovery plan (OD-R1 approved · Route B run, custody BLOCKED · OD-R1-C1 continuation prospective)

**Status: OD-R1 APPROVED by the owner, 2026-10-27 (Route B and the §5
amendments; record in §6). Stored-instruction alignment applied, subject to
orchestrator verification (§5). Not executed: no successor, transfer,
overlay refresh or engineer launch has occurred.** Authored 2026-10-27 by
`portfolio-design` (documentation only) after the owner asked: "Prepare a
recovery plan that preserves the existing candidate." Revised the same day
after orchestrator review (facts and procedure only; no new scope). The
approved pre-edit bytes (SHA-256
`71305b786341cbff681345c48732ce56ec06e5869232212c8851414eab875739`) are
preserved verbatim at `R/od-r1-approved-plan-71305b786341.md`; this updated
file necessarily has a different hash, which the orchestrator records on
verification. Only this header and §§5–8 changed; §§1–4 are intended
byte-identical to the approved copy.

**Status supersession (outside §§1–4).** Where §§1–4 say "proposed",
"recommended" or "after the §6 decision", read: specified and approved
under OD-R1. Their procedure, 38-path transfer membership, 807-path source
equality, RB-1…RB-8 (incl. RB-7L) and custody review are unchanged; no
exception is added. Route B runs only in a **new** compatible session and
ends at the §3.4 custody report. It is a prospective provenance transition:
it neither reconciles nor accepts the historical `fdce… → 0c27b84c…` index
discrepancy, which stays unexplained and disclosed, and the BLOCKED forensic
outcome (§1) stands. Not overlaid into any candidate; a later session cites
the approved copy and this file by path + SHA-256 as read-only inputs.

**Execution status and continuation (2026-10-27, outside §§1–4).** Route B
has since run in a new session. The successor holds 38 transfers and 807
paths, with source SHA-256 `dd898aaa…`. Its §3.4 custody review (session
`01a17f3d-ce40-7c32-b055-4a43cc95a48a`) returned **BLOCKED** because two
checks were denied: primary Git membership and the preview listener query.
That report and all of its evidence stay unchanged and BLOCKED. The
custody-review continuation `docs/phase-8a-custody-continuation.md`
(OD-R1-C1) was prepared and has not been executed. It narrowly supersedes
the no-alternate-route rules in §3.1 and §3.4 for one named purpose only:
a fixed trusted-host primary Git inventory and preview observations,
followed by one fresh read-only Codex judgment. It applies only in a new
compatible session that the owner starts for that review-only task. It
cannot be used for arbitrary retries or by the editing session. §§1–4 are
not edited. This file's pre-amendment SHA-256 was
`32f96566b6efcf1dfe8dbd165544499e1aef3b83bd9c3bb54e898774468b26cf`.

## 1. Fixed facts (from preserved evidence and host read-only checks)

Evidence root `C:/Users/alexx/Documents/portfolio3.0-phase8a-recovery`
(`R`). Forensic archive
`R/revision-index-preflight-2026-10-27T20-14-22-788Z` (`identity-and-verdict.json`,
`index-forensics-result.txt`, `inputs/preflight.json`, `inputs/manifest.json`).

- Original candidate `R/phase8a-candidate`, detached at
  `bfa8d8234fd698c8053fd9915a91b8ceeb5bd04e`. Source baseline
  `R/phase8a-baseline` = base **plus the original eleven governance
  overlays**; it is not a pristine base checkout.
- Matched: 25 product/test hashes (manifest `2146a0f2…`), 11 original
  overlays, other source (807 inventoried paths, no unexpected adds), report
  `bd9de09c…`, README `68be8fd2…`, lockfile `3249eaf2…`, diff `e5a40c5e…`,
  status `30b229a6…`; refs, stash and config unchanged.
- Raw candidate index before engineering (SHA-256)
  `fdce5bcf4e02f3b42b4bdc7fcf85297badb051102300b1dcd9705d311eedd896`
  versus current
  `0c27b84cf18f27a14ac43261bb2991dfa3c55916239d5e95c78ae1ed87ea0737`:
  **unexplained**. Baseline index `b26666a9…` is not the
  original. ctime=mtime reconstruction gives `a77cf71c…` (rejected).
- Fresh read-only Codex forensic review, session
  `01a17efc-3ada-74b3-b1a0-a25fe9527034`: valid DIRC v2, 801 entries, 72
  TREE nodes, 16/16 evidence hashes; verdict **BLOCKED** (original bytes
  absent). Forensic review, not product QA.
- Phase status: exit 1, not initialized. The 13-file overlay refresh
  (§10 item 4) and native engineer launch (item 5) have not run.
- Model mapping lives in `.claude/settings.local.json`. Host read-only
  `git ls-tree` at the exact base shows it **tracked** (100644 blob
  `b9057f87e1ba15fb1f449522df5761419fabe03b`); the recovered candidate's
  bytes equal the baseline's. Candidate maps `opus` → `claude-opus-5[1m]`;
  the primary's locally modified copy maps → `claude-opus-5-5[1m]`.
  Settings import or change is forbidden. The engineer's actual
  CLI/transcript model must be exactly native `claude-opus-5-5` before any
  edit; no fallback.
- Known shader failure stays open. Nothing here certifies publishability.

## 2. Route A — original proof recovery (preferred, if evidence exists)

1. Owner/evidence custodian supplies, as a **separate file** under `R`
   (never written to `R/phase8a-candidate/.git/index`), raw bytes whose
   SHA-256 equals `fdce5bcf4e02f3b42b4bdc7fcf85297badb051102300b1dcd9705d311eedd896`,
   or independently verifiable contemporaneous evidence that explains
   `fdce… → 0c27b84c…`. Never sourced from the retired scratchpad.
2. A new compatible orchestrator session hashes it, then a **new** fresh
   read-only Codex session (not `01a17efc…`) parses both indexes and
   confirms differences are metadata-only (paths, OIDs, modes, sizes, flags,
   TREE bytes equal).
3. On PASS, §10 item 3 is satisfied as written; the session stops and
   reports to the owner. No governance edit needed. Any later §10 item 4–5
   work is a separately directed continuation (§8). On failure, Route B
   only after the §6 decision.

## 3. Route B — successor container (recommended if A is unavailable)

**Nature.** A prospective provenance transition: the verified source bytes
of the existing candidate are **copied** (never moved) into a **new**
isolated container at the same approved base, with fresh Git metadata and
new manifests. It is **not** reconciliation of the historical index,
acceptance of `0c27b84c…`, an in-place index rebuild, or a guard waiver.
The `fdce…` gap stays disclosed in every later report.

**Preserved in place, read-only, unchanged:** `R/phase8a-candidate`
(worktree and `.git`), `R/phase8a-baseline` (worktree and `.git`), the
running preview (`127.0.0.1:3001`, never stopped or restarted), every file
at `R` top level and the forensic archive. Live-artifact exceptions are
only those named in §3.3.

**Proposed new paths (both verified absent 2026-10-27; must be absent at
start, else stop):**

- Container `R/phase8a-candidate-r2`
- Evidence `R/candidate-r2-transfer-evidence`

### 3.1 Custody rules

- **No Git command of any kind** in `R/phase8a-candidate` or
  `R/phase8a-baseline` (`git status` can rewrite a raw index; that is a
  plausible but unestablished cause of the drift). Read them only through
  filesystem reads and hashing.
- **Clone source:** local primary `main`, which must resolve to the full
  `bfa8d8234fd698c8053fd9915a91b8ceeb5bd04e` at execution. No remote
  fallback; any mismatch stops.
- **Git config/hook/filter gate, before clone and again before checkout:**
  record effective config with origin and scope (system, global, the new
  container's local), `core.hooksPath`, `core.fsmonitor`, every
  `filter.*` driver, `core.autocrlf`, `core.eol`, `core.filemode`,
  `core.safecrlf`, `core.symlinks`, and every attribute source
  (base-tracked `.gitattributes`, `info/attributes`, `core.attributesFile`).
  Any active hook path, fsmonitor, or filter/attribute (filter, `ident`,
  `working-tree-encoding`, unexpected eol conversion) not predicted in the
  evidence record **blocks**; it is never silently disabled or overridden.
- New container Git metadata is created fresh: clone of local `main`,
  single-branch, no tags, no hardlinks, no checkout, **empty template** (no
  hooks); then detached at `bfa8d82` and checked out only after the gate
  above passes. `.git`, config, hooks, `info/`, caches and `node_modules`
  are never copied from the primary, baseline or original candidate.
- Read commands in the new container run with `GIT_OPTIONAL_LOCKS=0`.
- Single writer: the orchestrator's host step creates and copies; no agent,
  engineer or reviewer runs concurrently. No sandbox or permission bypass;
  a denied action stops and is not retried by another route.

### 3.2 Source set, artifacts and transfer bounds

**Definitions (no wildcard excuses):**

- **Source set S** = every path tracked at `bfa8d82` (even if it matches an
  artifact pattern; e.g. base-tracked `.playwright-mcp/**` files are source)
  ∪ transfer set T. Expected complete source inventory after copy: 807
  paths, equal to the preserved record.
- **Transfer set T** = exactly **38 unique named paths**: the 25
  implementation paths from the preserved implementation table (candidate
  `docs/phase-8a-implementation.md`, manifest `2146a0f2…`), the 11 original
  overlay paths from the preserved `phase8a-amended-provenance.json`,
  `docs/phase-8a-implementation.md`, and
  `docs/baselines/phase-8a-candidate/README.md`. All eleven overlays are in T
  even when identical to baseline. Host check: only 29 of the 38 differ
  from baseline, because baseline already carries nine identical overlay
  files. No `docs/baselines/**` directory wildcard.
- Every source path **not** in T comes only from the exact `bfa8d82`
  checkout, never from the primary worktree.
- **`.git`** is never copied and is excluded only from source byte
  equality. The original candidate's and baseline's entire `.git` trees are
  separately walked, hashed and preserved (§3.3).
- **Known non-source artifacts** (not copied): each one actually present
  (e.g. `node_modules/`, `.next/`, `*.tsbuildinfo`, `test-results/`,
  `playwright-report/`, `blob-report/`, `coverage/`, `.vercel/`) is
  inventoried individually by path with size/mtime/hash and recorded as
  excluded. Ignored files are not silently skipped: any present path not in
  S and not a named known artifact **stops**, as does any new unknown path.

**Steps:**

1. **Safety pre-scan** of both original trees: reject (stop) absolute or
   `..` paths, symlinks, junctions or other reparse points, and
   case-colliding paths.
2. **Before snapshot** (to the evidence dir): SHA-256 of every file in both
   original trees, `.git` trees included; the primary checkout's source/Git
   fingerprint; SHA-256 of every forensic-archive and `R` top-level file;
   live-artifact records per §3.3.
3. **Pre-copy check:** in the fresh checkout, every base file **outside T**
   equals the preserved baseline and candidate bytes (path set and
   SHA-256). Files in T are not compared to baseline at this point.
4. **Membership check:** each of the 38 T paths is present in the original
   candidate with SHA-256 equal to its preserved manifest entry; any
   missing, extra or mismatched path stops.
5. Any `.claude/**` or `.codex/**` path in T that is not base-tracked stops
   for owner decision (settings import forbidden).
   `.claude/settings.local.json` is base-tracked and unchanged; it is not
   imported or modified.
6. **Copy T** byte-for-byte (binary) from the original candidate into the
   new container. No normalization, reauthoring, regeneration,
   line-ending change, `git add` or re-checkout. The 13-file refresh is a
   later, separate §10 item 4 step with its own manifest; this plan is not
   added to the overlay list (the original 13-path list is unchanged).
7. **Post-copy check:** full source set S of the new container equals the
   original candidate's source set (807 paths, every SHA-256).
8. No `npm ci`, build, gates or browser work in this step.

### 3.3 Required proofs (all must hold, else stop)

| ID | Criterion |
|---|---|
| RB-1 | New container HEAD = `bfa8d8234fd698c8053fd9915a91b8ceeb5bd04e`, detached; clone source `main` matched that full SHA; allowed initial ref set is exactly `refs/heads/main` and `refs/remotes/origin/main`, both at that approved full base SHA, plus optionally symbolic `refs/remotes/origin/HEAD` → `refs/remotes/origin/main`; no other refs or tags; refs are never deleted or relabeled to force this proof; no hooks present; §3.1 config gate record shows no active hook/filter/fsmonitor. |
| RB-2 | Index entries (path, mode, OID, stage) = preserved `index-entries.txt`; flags = `index-flags.txt` normal; HEAD tree = `head-tree.txt`. |
| RB-3 | Source equality: new container S = original candidate S (807 paths, every SHA-256); T = the 38 named paths; base files outside T came from the exact checkout. `.git` and individually inventoried known artifacts are the only exclusions. |
| RB-4 | Allowed-diff audit: `git diff --binary bfa8d82` digest = `e5a40c5e…`; status `--porcelain=v1 -uall` digest = `30b229a6…`; staged diff empty; changed paths ⊆ brief §§3–4 plus overlays and evidence paths. |
| RB-5 | Changed/untracked set equality: the union of modified and untracked paths (each counted once) equals the preserved status record, each with SHA-256. This is separate from T membership. |
| RB-6 | Separate fresh fingerprints of the new container: HEAD, refs list, config file hash, raw index SHA-256 **and a retained copy of the raw index bytes**, `ls-files --stage` digest. Labelled "new container baseline of record", never "pre-engineering `fdce`". |
| RB-7 | Immutable preservation: original candidate source and `.git`, baseline source and `.git`, forensic archive, `R` top-level evidence, the original frozen preview JSON and captures are hash-identical to the before snapshot. Primary checkout source/Git unchanged. Any change outside the live artifacts below blocks. |
| RB-7L | Live artifacts, recorded separately (possible runtime writes from the independent preview; not source, not copied): original candidate `.next/` (before/after inventory, metadata, hashes) and `R/preview-server.log` (before length + SHA-256 of that prefix; after: the first *before-length* bytes hash identically, i.e. append-only; no truncation or rewrite). Preview is never stopped or restarted. |
| RB-8 | New link manifest records: original candidate + baseline fingerprints, the 16 evidence hashes and `archive-manifest.json` hash, the 38-path T with hashes, artifact inventory, config-gate record, new container fingerprints, and the explicit statement that `fdce…` remains unexplained. |

### 3.4 Custody review (narrow; not product QA)

A **new** `codex exec` process and session, `--sandbox read-only`,
`approval_policy` never, own output file; identity from CLI version, session
ID and rollout telemetry (never self-report); session ID differs from
`01a17efc…` and engineer `01a17e5b-8e27-7ba3-bf76-f20961ac1d6a`. Inputs:
this plan (path + hash), the evidence dir, read access to the original and
new trees. It verifies RB-1…RB-8 (including RB-7L) independently, with host
before/after source/Git checks around its run. Denied launch, identity
mismatch, integrity drift or any blocking finding stops. It does not
replace the later §7 build, five gates, AC-22…AC-25 browser/performance
evidence or the separate final fresh Codex product QA.

## 4. Unchanged limits

No Kimi. No Phase 6 work outside the runner; migration blocked/unaccepted;
no phase command except `status`. D-1/D-2/D-3, hover, font-size,
dynamic-shadow and PC-model extensions stay unapproved. §§1–9 allowlists,
OD-2a and §7 completion rules stand. No commit, push, publication,
checkpoint, replacement baseline, acceptance or waiver (OD-3 owner-only).
The existing approved visual revision intent remains and is not
re-requested.

## 5. Governance alignment (approved under OD-R1; applied 2026-10-27, subject to orchestrator verification)

These minimal edits were authorized by OD-R1 (§6). Profile edits were made
by the orchestrator under owner manual permission; the four design/
orchestration documents by `portfolio-design` (documentation only). They are
stored sources, not active in the session that made them, and a resumed
session does not gain them. Only a **new** compatible session that loads
them may act on them.

1. `docs/phase-8-design.md` §10 item 2: allow, as the work location, the
   owner-approved successor `R/phase8a-candidate-r2` carrying the existing
   candidate's verified bytes; original stays preserved read-only.
   *Applied.*
2. `docs/phase-8-design.md` §10 item 3: add "or, if the original bytes are
   unavailable, the owner-approved provenance transition in
   `docs/phase-8a-recovery-plan.md` with RB-1…RB-8 and a PASS custody
   review; the `fdce` gap stays disclosed, never reconciled." *Applied*,
   with item 4 and a stop rule clarifying that later steps act on the
   successor and are separately directed.
3. `.claude/agents/portfolio-8a-engineer.md` line 23: write root →
   `R/phase8a-candidate-r2`; add original candidate to the read-only list.
   *Applied by the orchestrator* (also requires finished OD-R1 custody PASS
   plus separately directed continuation and §10 items 4–5).
4. `.claude/agents/portfolio-orchestrator.md` (recovered-8A paragraph):
   permit the transition only per the amended §10; keep "never rewrite the
   index". *Applied by the orchestrator* (host reconstruction only, new
   compatible session, no Git commands in either original tree, stop after
   the custody review even on PASS).
5. `docs/astra-orchestration.md` provider note "raw-index drift … blocks
   until reconciled": add "or is superseded by the owner-approved §10
   transition". *Applied.*
6. `docs/phase-8a-visual-revision.md` §7 "lands on the existing recovered
   candidate": add "or its owner-approved successor container". *Applied*,
   with §6 item 2 and the §7 next role reconciled to match.

The 13-path overlay list is unchanged; a later refresh would carry the
amended bytes. A session whose loaded profiles predate these edits must not
act on them.

## 6. Owner decision record (OD-R1)

**Owner messages (agent-transcribed, not signatures).** The owner, Alex
Xiong, wrote in the orchestration chat, verbatim:

> Approve OD-R1. Begin implementation

and then, as the latest scoped direction:

> Finish OD-R1 stored-instruction alignment only. Verify the approved
> documentation and agent profiles, preserve the existing candidate, then
> stop.

**Approved text.** OD-R1 as presented: "Approve Route B of
`docs/phase-8a-recovery-plan.md` (SHA-256 to be recorded at decision time):
if Route A evidence is not supplied, create the successor container and
evidence dir at the §3 paths, copy the 38 verified transfer paths under
§3.2, and require RB-1…RB-8 plus a fresh read-only Codex custody review,
then stop and report; authorize the §5 governance edits." Recorded SHA-256
of the approved (pre-edit) plan:
`71305b786341cbff681345c48732ce56ec06e5869232212c8851414eab875739`; copy
preserved at `R/od-r1-approved-plan-71305b786341.md` (host-verified to
match before these edits).

**Reading.** "Begin implementation" is read within OD-R1's own bounds and
the latest direction: it begins the §5 stored-instruction alignment, not
visual implementation, recovery execution, overlay refresh or engineer
launch. The current session cannot execute Route B or start an engineer.

Not implied: visual implementation, overlay refresh, engineer launch, gate
waiver, acceptance, commit, push, publication or checkpoint. D-1/D-2/D-3,
the D-1 interim revert, V1–V7 as thresholds and OD-3 remain unapproved.
Route A remains available if its evidence is supplied first (§2).

## 7. Unresolved details

- U-1 Whether Route A evidence exists anywhere outside the retired
  scratchpad (owner/custodian). Open.
- U-2 **Resolved:** clone from local primary `main`; must equal full
  `bfa8d8234fd698c8053fd9915a91b8ceeb5bd04e` at execution; no remote
  fallback; mismatch stops. OD-R1 approved and §5 edits applied (subject to
  verification); a new compatible session is still required before creating
  the successor.
- U-3 **Resolved:** T is the 38 named paths in §3.2, taken by exact path
  from the preserved implementation table and provenance file; unknown or
  mismatched paths stop.
- U-4 Prospective launch approach only (not in recovery scope, not
  identity proof): process-only explicit model selection via the supported
  Claude Code `--model claude-opus-5-5` option (verified present in CLI
  `--help`) with the `portfolio-8a-engineer` role; no settings writes or
  imports, no fallback. Actual CLI/transcript exact native
  `claude-opus-5-5` remains mandatory before any edit. Precedence between
  the flag and any profile model field is a **prelaunch proof**, not a
  reason to alter settings.
- U-5 **Resolved:** `.claude/settings.local.json` is base-tracked (blob
  `b9057f87…`), candidate bytes equal baseline; no import or change.

## 8. Next roles

1. Orchestrator (current session): verify the §5 edits in the four
   documents and two profiles, record this file's new hash beside the
   approved copy, then stop. No transfer, recovery or launch in this session.
2. Owner: optionally supply Route A evidence; start a **new** compatible
   orchestrator session when ready.
3. New compatible orchestrator session: Route A if its evidence is supplied;
   otherwise §3 host steps and RB-1…RB-8 (incl. RB-7L), then the §3.4 new
   fresh read-only Codex custody review. **Recovery scope stops here** and
   reports PASS/BLOCKED to the owner, even on PASS.
4. Any later §10 item 4–5 work (13-file overlay refresh, identity proof,
   native engineer), final host build/five gates, AC-22…AC-25 evidence,
   fresh separate Codex product QA and owner visual review is a separately
   directed continuation under the governing approvals, never automatic.
5. Custody continuation (prospective): after the stored alignment has been
   verified, the owner may start a new compatible session for the
   review-only OD-R1-C1 procedure in
   `docs/phase-8a-custody-continuation.md`. That session reuses the
   existing successor read-only, writes only to a new
   `R/candidate-r2-custody-continuation-evidence`, and stops when it
   reports PASS or BLOCKED. Item 4 still requires separate direction.
