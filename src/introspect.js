import { McpError, EXIT_CONNECTION_ERROR } from './errors.js';
import { createStdioClient } from './clients/stdio.js';
import { createSseClient } from './clients/http.js';
import { getCachedTools, setCachedTools, DEFAULT_TTL } from './cache.js';

/**
 * Introspect an MCP server to get available tools.
 * @param {Object} config - MCP server configuration
 * @param {string} config.type - Server type: 'sse' | 'stdio'
 * @param {string} [config.url] - SSE server URL (required for 'sse' type)
 * @param {string} [config.command] - Command to spawn (required for 'stdio' type)
 * @param {string[]} [config.args=[]] - Command arguments (for 'stdio' type)
 * @param {Object} [config.env={}] - Environment variables (for 'stdio' type)
 * @param {string} [config.cwd] - Working directory (for 'stdio' type)
 * @param {Object} [config.headers={}] - HTTP headers (for 'sse' type)
 * @param {Object} [options={}] - Introspection options
 * @param {boolean} [options.verbose=false] - Enable verbose logging
 * @param {boolean} [options.noCache=false] - Skip cache and force introspection
 * @param {string} [options.cacheKey] - Custom cache key (defaults to config.name)
 * @returns {Promise<Array>} Array of tool definitions
 */
export const introspectMcpServer = async (config, options = {}) => {
  const { verbose = false, noCache = false, cacheKey } = options;
  const { type } = config;

  if (!type) {
    throw McpError('MCP server config must include type (sse or stdio)', 'INVALID_CONFIG', 1);
  }

  // Check cache first (unless noCache is true)
  const key = cacheKey || config.name;
  if (!noCache && key) {
    const cachedTools = getCachedTools(key);
    if (cachedTools) {
      if (verbose) {
        console.log('Using cached tools');
      }
      return cachedTools;
    }
    if (verbose) {
      console.log('Cache miss');
    }
  } else if (verbose && noCache) {
    console.log('Cache disabled');
  }

  let client;

  if (type === 'stdio') {
    client = createStdioClient(config);
  } else if (type === 'sse') {
    client = createSseClient(config);
  } else {
    throw McpError(`Unsupported MCP server type: ${type}`, 'INVALID_CONFIG', 1);
  }

  try {
    await client.connect();
    const tools = await client.listTools();
    
    // Store tools in cache after successful introspection
    if (!noCache && key) {
      setCachedTools(key, tools, DEFAULT_TTL);
    }
    
    return tools;
  } finally {
    client.disconnect();
  }
};

// Keep backward compatible with old export
export const introspect = async (client) => {
  return { tools: [], resources: [], prompts: [] };
};
