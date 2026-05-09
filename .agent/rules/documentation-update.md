# Documentation Update Rule

## Purpose

This rule is shared by Codex, Claude Code, and other coding agents that work in this repository.

Whenever code is added, changed, refactored, or fixed, update project documentation in `docs/` during the same task.

## Applies To

Run this rule after every code edit, including:

- new files, modules, services, tools, prompts, APIs, UI, scripts, configuration, skills, MCP configuration, or agent rules
- changed behavior, architecture, data flow, dependencies, environment variables, or runtime wiring
- bug fixes, compatibility fixes, typing fixes, validation changes, or performance changes
- data-layer changes, including entities, tables, fields, SQL queries, repositories, caches, external data sources, MCP data access, or data contracts

## Documentation Placement

- Same module, feature, or business topic: update the existing related Markdown file in `docs/`.
- Different module, feature, data domain, or delivery topic: create a new Markdown file in `docs/`.
- Use lowercase kebab-case names, for example:
  - `docs/agent-runtime-refactor.md`
  - `docs/mcp-tooling-changes.md`
  - `docs/chat-history-data-changes.md`

## Required Sections

Every documentation update must include:

- Change date: `YYYY-MM-DD`.
- Changed scope: modules, directories, APIs, services, pages, tools, prompts, rules, skills, MCP, or runtime paths affected.
- Added content: new capabilities, files, entry points, configuration, dependencies, docs, skills, or MCP integrations.
- Updated content: changed behavior, structure, call flow, ownership, responsibilities, or integration points.
- Fixed content: bugs or risks fixed; write `None` if there are no fixes.
- Data-layer changes: tables, fields, entities, repositories, queries, caches, MCP data access, external data sources, or data flow changes; write `None` if there are no data-layer changes.
- Compatibility and migration notes: environment variables, data migration, deployment actions, manual steps, breaking changes, or agent setup changes; write `None` if not applicable.
- Verification: commands run, result, and any commands that could not be run with the reason.

## Required Workflow

After finishing code edits:

1. Inspect changed files and decide whether the work belongs to an existing docs topic.
2. Update the matching docs file, or create a new Markdown file under `docs/`.
3. Include all required sections above.
4. Explicitly document data-layer impact, even when the answer is `None`.
5. Run a lightweight verification such as `git diff --check` when possible.
6. In the final response, mention the docs file path and verification status.

## Shared Agent Directory Convention

Use `.agent/` for repository-local agent configuration that should be reusable by multiple coding agents:

- `.agent/rules/`: shared behavioral and workflow rules
- `.agent/skills/`: repository-local skills or skill references
- `.agent/mcp/`: MCP configuration notes, server references, or setup docs

Do not put shared repository rules only under agent-specific directories such as `.cursor/`, `.claude/`, or `.codex/`.

## Do Not

- Do not finish a code-change task without updating docs.
- Do not use `README.md` as the only docs update unless the change truly only affects README-level usage.
- Do not omit data-layer impact.
- Do not omit verification status.
- Do not paste large implementation blocks into docs; describe behavior, impact, migration, and validation.
