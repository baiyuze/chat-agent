# Agent Entry

This repository uses `.agent/` as the shared configuration entry for coding agents.

Start here:

- Shared overview: `.agent/README.md`
- Rules: `.agent/rules/`
- Skills: `.agent/skills/`
- MCP: `.agent/mcp/`

Agent-specific directories are shortcuts to the shared configuration:

- `.codex/`
- `.claude/`

Do not duplicate long-lived rules in agent-specific directories. Update `.agent/` and keep agent-specific directories as references or symlinks.

Before finishing any code change, follow `.agent/rules/documentation-update.md`.
