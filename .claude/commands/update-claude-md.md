---
description: Audit and update CLAUDE.md to match the current codebase (delegates to the update-claude-md skill)
---

Invoke the `update-claude-md` skill (via the Skill tool) and follow its process exactly: find doc-vs-code drift, replace stale sections in place, verify every referenced path/symbol still exists, enforce the ≤9,000-character / ≤120-line budget, and report the sections changed plus the final character count.

If the Skill tool cannot find `update-claude-md`, read and follow `.claude/skills/update-claude-md/SKILL.md` directly.
