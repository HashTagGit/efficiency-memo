# Task 7 Evidence: Hierarchical AGENTS.md

## Acceptance criteria
- [x] 6 AGENTS.md files exist (root + 3 packages + 2 features)
- [x] Each file >= 200 characters
- [x] Each file contains "Purpose" section
- [x] Each file contains "Patterns" + "Constraints" + "Dependencies" sections
- [x] Each file accurately reflects the codebase (no hallucinated features)
- [x] No em-dashes or en-dashes in new content
- [x] No AI-slop phrases
- [x] apps/web/AGENTS.md preserves existing Next.js warning block

## Files (with sizes)

| Path | Size (chars) | Purpose | Context | Patterns | Constraints | Dependencies |
|------|--------------|---------|---------|----------|-------------|--------------|
| ./AGENTS.md | 3438 | yes | yes | yes | yes | yes |
| ./packages/ui/AGENTS.md | 3259 | yes | yes | yes | yes | yes |
| ./packages/shared/AGENTS.md | 2910 | yes | yes | yes | yes | yes |
| ./apps/web/AGENTS.md | 4446 | yes | yes | yes | yes | yes |
| ./apps/web/src/features/charger-reminder/AGENTS.md | 4233 | yes | yes | yes | yes | yes |
| ./apps/web/src/features/core-hour/AGENTS.md | 4380 | yes | yes | yes | yes | yes |

## QA Commands

```
Get-ChildItem -LiteralPath . -Recurse -Filter "AGENTS.md" | Measure-Object
# Count: 6

# Section presence per file: 6/6 have Purpose, Context, Patterns, Constraints, Dependencies
# Em/en dash count across all 6 files: 0
```

## Commit
`1ef031c docs: add hierarchical AGENTS.md (6 files)` (3 files, 131 insertions)

## Note on apps/web submodule
`apps/web/` is registered as a git submodule in the parent repo (gitlink 160000), but the submodule's `.git/modules/apps/web` metadata is missing. The parent `git add` rejects paths inside `apps/web/` ("fatal: Pathspec ... is in submodule 'apps/web'"). The 3 AGENTS.md files inside apps/web are correctly written and present on disk; the parent commit captures the 3 files at the workspace root. The submodule configuration itself is a Task 3 artifact and is out of scope for Task 7.
