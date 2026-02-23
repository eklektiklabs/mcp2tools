import { McpError, EXIT_CONNECTION_ERROR } from './errors.js';
import { createStdioClient } from './clients/stdio.js';
import { createSseClient } from './clients/http.js';
import { getCachedTools, setCachedTools, DEFAULT_TTL } from './cache.js';

/**
 * Sanitize server name for use as namespace prefix.
 * Converts hyphens to underscores.
 * @param {string} name - Server name
 * @returns {string} Sanitized name
 */
export const sanitizeServerName = (name) => {
  if (!name) return 'unknown';
  return name.replace(/-/g, '_');
};

/**
 * Prefix tool name with sanitized server name.
 * @param {string} toolName - Original tool name
 * @param {string} serverName - Server name to prefix with
 * @returns {string} Prefixed tool name
 */
export const prefixToolName = (toolName, serverName) => {
  const sanitized = sanitizeServerName(serverName);
  return `${sanitized}_${toolName}`;
};

/**
 * Introspect a single MCP server to get available tools.
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
export const introspectSingleServer = async (config, options = {}) => {
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

/**
 * Introspect MCP server(s) to get available tools.
 * @param {Object|Object[]} config - MCP server configuration(s)
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
 * @param {boolean} [options.namespacePrefix=true] - Prefix tool names with server name
 * @returns {Promise<Array>} Array of tool definitions from all servers
 */
export const introspectMcpServer = async (config, options = {}) => {
  const { namespacePrefix = true } = options;
  
  // Handle single config or array of configs
  const configs = Array.isArray(config) ? config : [config];
  
  if (configs.length === 0) {
    return [];
  }
  
  // If single config (backward compatible), use original behavior
  if (!Array.isArray(config)) {
    const tools = await introspectSingleServer(config, options);
    return tools;
  }
  
  // Multi-server: introspect each server and merge with namespace prefix
  const allTools = [];
  const failures = [];
  
  for (const serverConfig of configs) {
    const serverName = serverConfig.name || 'unknown';
    try {
      if (options.verbose) {
        console.log(`Introspecting server: ${serverName}`);
      }
      
      const tools = await introspectSingleServer(serverConfig, options);
      
      // Prefix tool names with sanitized server name
      const prefixedTools = tools.map(tool => ({
        ...tool,
        name: namespacePrefix ? prefixToolName(tool.name, serverName) : tool.name
      }));
      
      if (options.verbose) {
        console.log(`Found ${prefixedTools.length} tools from ${serverName}`);
      }
      
      allTools.push(...prefixedTools);
    } catch (error) {
      failures.push({ server: serverName, error: error.message });
      if (options.verbose) {
        console.error(`Failed to introspect server ${serverName}: ${error.message}`);
      }
    }
  }
  
  if (failures.length > 0 && options.verbose) {
    console.log(`Failed servers: ${failures.map(f => f.server).join(', ')}`);
  }
  
  return allTools;
};

// Keep backward compatible with old export
export const introspect = async (client) => {
  return { tools: [], resources: [], prompts: [] };
};
