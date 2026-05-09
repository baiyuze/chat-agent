# Agent Configuration

## 2026-05-09

### 改动范围

- 根目录 agent 入口文件。
- `.agent/` 共享 agent 配置目录。
- `.codex/` 与 `.claude/` agent 专用快捷引用目录。

### 新增内容

- 新增 `AGENT.md`，作为仓库级 agent 入口说明。
- 说明共享配置统一维护在 `.agent/`。
- 说明 `.codex/`、`.claude/` 仅作为指向 `.agent/` 的快捷引用。

### 更新内容

- 明确 agent 开始工作时应优先查看 `.agent/README.md`、`.agent/rules/`、`.agent/skills/`、`.agent/mcp/`。
- 明确长期规则不应在 `.codex/` 或 `.claude/` 中重复维护。
- 明确代码变更完成前需要遵循 `.agent/rules/documentation-update.md`。

### 修复内容

- None

### 数据层改造

- None

### 兼容性与迁移

- None

### 验证情况

- 已执行 `git diff --check`。
