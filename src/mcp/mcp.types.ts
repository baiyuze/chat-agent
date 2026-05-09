export type JsonSchema = {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  default?: unknown;
};

export type McpToolDefinition = {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
};

export type McpJsonRpcResponse<T> = {
  jsonrpc?: "2.0";
  id?: number;
  result?: T;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};
