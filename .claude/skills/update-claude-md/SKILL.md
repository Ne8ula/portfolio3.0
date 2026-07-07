---
name: update-claude-md
description: Audit and update the project CLAUDE.md so it matches the current codebase. Use when the user says "update claude.md" / "sync the doc", after finishing a feature or redesign, or whenever CLAUDE.md has drifted from the code.
---

# Update CLAUDE.md

Bring `CLAUDE.md` (project root) in line with the CURRENT codebase. The doc
describes the present — never history, never plans that already shipped.

## Process

1. **Find the drift.** Compare the doc against reality:
   - `git log --oneline -15` and the current session's changes for what moved.
   - Skim `components/cockpit/` file headers + exports for renamed/added/removed
     modules, and check the `window.__cockpit*` bridge, view modes, and
     `TWEAK_DEFAULTS` values against what the doc claims.
2. **Replace in place.** Rewrite stale sections; delete sections describing
   removed things entirely. Never append changelog-style notes or "⚠️ direction
   change" callouts — fold the new truth into the existing structure.
3. **Verify every reference.** Grep each file path, symbol, event name, and
   global mentioned in the doc; drop or fix any that no longer exist.
4. **Enforce the size budget** (protects model performance / reduces
   hallucination surface):
   - **≤ 9,000 characters and ≤ 120 lines total.** If over, cut until under —
     start with anything derivable by reading the code.
   - Keep ONLY what an agent can't cheaply derive: architecture map, preserved
     contracts (the `__cockpit*` bridge, screenCorners), conventions (jade-only
     accent, imperative three.js), gotchas/pitfalls, and dialed-in layout values.
   - No duplicated facts, no code samples over 3 lines, tables only where denser
     than prose, no marketing prose.
5. **Report.** End with: sections replaced/removed, final character count
   (`(Get-Content CLAUDE.md -Raw).Length` in PowerShell), and anything you
   deliberately left out.

## Style contract for the doc itself

- First line block states it's a living doc + the budget + this skill's name.
- Section order: Overview · Dev · User flow · Architecture · Bridge ·
  Layout dial-ins · Design system · Gotchas · Next.
- Present tense, terse, one-line-per-fact. Links as `[file](path)` markdown.
