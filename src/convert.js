/**
 * Converts an MCP tool name to a valid JavaScript identifier.
 * Replaces hyphens with underscores, removes invalid characters.
 * @param {string} name - The MCP tool name
 * @returns {string} - Valid JS identifier
 */
export const sanitizeToolName = (name) => {
  if (typeof name !== 'string') {
    return '';
  }
  // Replace hyphens with underscores, remove invalid identifier chars
  return name
    .replace(/-/g, '_')
    .replace(/[^a-zA-Z0-9_$]/g, '')
    .replace(/^([0-9])/, '_$1');
};

/**
 * Converts an MCP tool definition to Anthropic format.
 * @param {Object} mcpTool - MCP tool definition with inputSchema
 * @returns {Object} - Anthropic tool format with input_schema
 */
export const convertToAnthropicTool = (mcpTool) => {
  if (!mcpTool || typeof mcpTool !== 'object') {
    return null;
  }
  return {
    name: sanitizeToolName(mcpTool.name),
    description: mcpTool.description || '',
    input_schema: mcpTool.inputSchema || mcpTool.input_schema || {},
  };
};

/**
 * Converts an MCP tool definition to OpenAI function tool format.
 * @param {Object} mcpTool - MCP tool definition with inputSchema
 * @returns {Object} - OpenAI function tool format with type and function
 */
export const convertToOpenAITool = (mcpTool) => {
  if (!mcpTool || typeof mcpTool !== 'object') {
    return null;
  }
  return {
    type: 'function',
    function: {
      name: sanitizeToolName(mcpTool.name),
      description: mcpTool.description || '',
      parameters: mcpTool.inputSchema || mcpTool.input_schema || {},
    },
  };
};

/**
 * Converts an array of MCP tools to Anthropic format.
 * @param {Array} mcpTools - Array of MCP tool definitions
 * @returns {Array} - Array of Anthropic tool definitions
 */
export const convertTools = (mcpTools) => {
  if (!Array.isArray(mcpTools)) {
    return [];
  }
  return mcpTools.map(convertToAnthropicTool).filter(Boolean);
};


/**
 * Converts an array of MCP tools to the specified format.
 * @param {Array} mcpTools - Array of MCP tool definitions
 * @param {string} type - Target format: 'anthropic' or 'openai'
 * @returns {Array} - Array of converted tool definitions
 */
export const convertToolsByType = (mcpTools, type = 'anthropic') => {
  if (!Array.isArray(mcpTools)) {
    return [];
  }
  if (type === 'openai') {
    return mcpTools.map(convertToOpenAITool).filter(Boolean);
  }
  return mcpTools.map(convertToAnthropicTool).filter(Boolean);
};

export const convertSchema = (schema) => {
  return schema;
};
