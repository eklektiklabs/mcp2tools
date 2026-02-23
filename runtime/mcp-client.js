import { createStdioClient } from '../src/clients/stdio.js';
import { createSseClient } from '../src/clients/http.js';
import { McpError, EXIT_CONNECTION_ERROR } from '../src/errors.js';

/**
 * Runtime MCP client factory - creates appropriate client based on config.
 * @param {Object} config - Configuration object
 * @param {string} [config.type='stdio'] - Client type: 'stdio' or 'http'/'sse'
 * @param {string} [config.command] - Command for stdio client
 * @param {string[]} [config.args=[]] - Command arguments for stdio client
 * @param {Object} [config.env={}] - Environment variables for stdio client
 * @param {string} [config.cwd] - Working directory for stdio client
 * @param {string} [config.url] - URL for http/sse client
 * @param {Object} [config.headers={}] - HTTP headers for http/sse client
 * @returns {Object} MCP client with connect, disconnect, callTool methods
 */
export const createClient = (config) => {
  if (!config) {
    throw McpError('Client config is required', 'INVALID_CONFIG', 1);
  }

  // Determine client type from config
  const type = config.type || (config.url ? 'http' : 'stdio');
  
  let client;

  switch (type) {
    case 'stdio':
      client = createStdioClient(config);
      break;
    case 'http':
    case 'sse':
      client = createSseClient(config);
      break;
    default:
      throw McpError(
        `Unknown client type: ${type}. Use 'stdio', 'http', or 'sse'`,
        'INVALID_CONFIG',
        1
      );
  }

  // Wrap with unified API
  return {
    /**
     * Connect to the MCP server
     * @returns {Promise<void>}
     */
    connect: () => client.connect(),

    /**
     * Disconnect from the MCP server
     */
    disconnect: () => client.disconnect(),

    /**
     * Call a tool on the MCP server
     * @param {string} name - Tool name
     * @param {Object} [args={}] - Tool arguments
     * @returns {Promise<Object>} Tool execution result
     */
    callTool: (name, args = {}) => client.callTool(name, args),

    /**
     * List available tools on the MCP server
     * @returns {Promise<Array>} List of available tools
     */
    listTools: () => client.listTools(),

    /**
     * Send a raw JSON-RPC request
     * @param {string} method - MCP method name
     * @param {Object} [params={}] - Method parameters
     * @returns {Promise<Object>} Response result
     */
    sendRequest: (method, params = {}) => client.sendRequest(method, params),

    /**
     * Set message handler for incoming messages
     * @param {Function} handler - Handler function
     */
    onMessage: (handler) => client.onMessage(handler),

    /**
     * Check if client is connected
     * @returns {boolean}
     */
    get isConnected() {
      return client.isConnected;
    }
  };
};

export default createClient;
