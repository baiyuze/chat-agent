# Shared Agent Configuration

This directory stores repository-local configuration shared by Codex, Claude Code, and other coding agents.

- `rules/`: shared behavior and workflow rules
- `skills/`: repository-local skills or skill references
- `mcp/`: MCP configuration notes, server references, or setup docs

Agent-specific directories such as `.codex/` and `.claude/` should reference this directory instead of duplicating long-lived rules.
