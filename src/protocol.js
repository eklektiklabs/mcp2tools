// MCP Protocol definitions

// JSON-RPC version constant
export const JSONRPC_VERSION = "2.0";

// MCP method constants
export const TOOLS_LIST = "tools/list";
export const TOOLS_CALL = "tools/call";
export const RESOURCES_LIST = "resources/list";
export const PROMPTS_LIST = "prompts/list";

// Request/Response type helpers
export const isJsonRpcRequest = (data) => {
  return (
    data &&
    typeof data === 'object' &&
    data.jsonrpc === JSONRPC_VERSION &&
    typeof data.method === 'string'
  );
};

export const isJsonRpcResponse = (data) => {
  return (
    data &&
    typeof data === 'object' &&
    data.jsonrpc === JSONRPC_VERSION &&
    ('result' in data || 'error' in data) &&
    typeof data.id !== 'undefined'
  );
};

export const isJsonRpcError = (data) => {
  return (
    data &&
    typeof data === 'object' &&
    data.error &&
    typeof data.error.code === 'number' &&
    typeof data.error.message === 'string'
  );
};

// Create JSON-RPC request
export const createJsonRpcRequest = (id, method, params = {}) => ({
  jsonrpc: JSONRPC_VERSION,
  id,
  method,
  params
});

// Create JSON-RPC response (success)
export const createJsonRpcSuccessResponse = (id, result) => ({
  jsonrpc: JSONRPC_VERSION,
  id,
  result
});

// Create JSON-RPC response (error)
export const createJsonRpcErrorResponse = (id, error) => ({
  jsonrpc: JSONRPC_VERSION,
  id,
  error: {
    code: error.code || -32603,
    message: error.message || 'Internal error',
    ...(error.data !== undefined && { data: error.data })
  }
});

// MCP Protocol definitions
export const MCP_METHODS = {
  TOOLS_LIST: 'tools/list',
  TOOLS_CALL: 'tools/call',
  RESOURCES_LIST: 'resources/list',
  PROMPTS_LIST: 'prompts/list'
};

export const createMcpRequest = (method, params = {}) => ({
  jsonrpc: '2.0',
  id: Date.now(),
  method,
  params
});

export const parseMcpResponse = (response) => {
  if (response.error) {
    throw new Error(response.error.message);
  }
  return response.result;
};
