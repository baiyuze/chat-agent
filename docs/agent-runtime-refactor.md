# Agent Runtime Refactor

## 2026-05-09

### 改动范围

- `src/langchain/` agent 创建、模型、工具、事件输出和通用工具函数。
- `src/mcp/` MCP 客户端、schema 转换、响应解析、工具列表渲染。
- `src/prompts/` agent 系统提示词 Markdown。
- `src/common/` prompt 动态读取工具。

### 新增内容

- 新增 `src/common/prompt-loader.ts`，用于创建 agent 时动态读取 `src/prompts/*.md`。
- 新增 `src/prompts/research.md` 和 `src/prompts/mcp-business-tools.md`，将提示词正文从 TypeScript 中拆出。
- 新增 LangChain 领域模块：
  - `src/langchain/model/chat-model.factory.ts`
  - `src/langchain/tools/internet-search.tool.ts`
  - `src/langchain/tools/custom-tools.factory.ts`
  - `src/langchain/events/tool-output.util.ts`
  - `src/langchain/utils/*.ts`
  - `src/langchain/langchain.types.ts`
- 新增 MCP 领域模块：
  - `src/mcp/mcp.types.ts`
  - `src/mcp/mcp-schema.util.ts`
  - `src/mcp/mcp-response.util.ts`
  - `src/mcp/mcp-tool-list.util.ts`

### 更新内容

- `LangChainService` 保留 `chat`、`streamChat` 和 agent 编排入口，不再内联模型、提示词、工具和输出解析逻辑。
- `McpClientService` 保留 MCP 配置判断、工具加载、工具调用和请求入口，不再内联 schema 转换和响应渲染逻辑。
- 系统提示词改为创建 agent 时动态读取 Markdown，动态日期和 MCP 工具列表在读取后拼接。
- `.agent/` 成为仓库级 agent 配置源，`.codex/` 和 `.claude/` 使用软链接引用共享配置。

### 修复内容

- 修复 MCP 未配置时仍尝试读取 MCP 工具提示词的问题。

### 数据层改造

- 新增自定义工具 `message_sql_query`，通过 `ChatMessageEntity` 对应仓库执行消息表 SQL 查询。
- 未修改数据库表结构、实体字段或迁移脚本。

### 兼容性与迁移

- 提示词文件需要保留在 `src/prompts/`，或通过 `PROMPTS_DIR` 指向外部提示词目录。
- `.codex/` 和 `.claude/` 下的内容是指向 `.agent/` 的软链接，跨平台复制仓库时需要保留 symlink。

### 验证情况

- 已执行 `git diff --check`。
- 当前 shell 中 `node`、`npm`、`yarn` 不在 `PATH`，未能直接执行 `npm run build:server` 或 `yarn build:server`。
