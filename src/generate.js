import { render, loadTemplate } from './template.js';
import { convertToolsByType } from './convert.js';
import path from 'path';

/**
 * Generates code from tools and config
 * @param {Array} tools - Array of MCP tool definitions
 * @param {Object} config - Configuration object
 * @param {Object} options - Generation options (templateDir, templateName, etc.)
 * @returns {string} Generated code string
 */
export const generateCode = (tools, config, options = {}) => {
  const templateDir = options.templateDir || path.join(process.cwd(), 'templates');
  const type = options.type || 'anthropic';
  
  // Select template based on type
  let templateName = options.templateName;
  if (!templateName) {
    templateName = type === 'openai' ? 'tools.openai.js' : 'tools.js';
  }
  
  // Load template
  const template = loadTemplate(templateName, templateDir);
  if (!template) {
    return '';
  }
  
  // Convert tools to target format
  const convertedTools = convertToolsByType(tools, type);
  
  // Prepare template data - serialize input_schema to JSON string
  // OpenAI needs flattened function properties for template access
  const isOpenAI = type === 'openai';
  const templateData = {
    templateName: templateName,
    type: type,
    isOpenAI: isOpenAI,
    isAnthropic: type === 'anthropic',
    description: config.description || '',
    tools: convertedTools.map(tool => {
      if (type === 'openai') {
        // OpenAI: flatten function properties for template
        return {
          name: tool.function.name,
          description: tool.function.description,
          parameters: JSON.stringify(tool.function.parameters || {}),
          input_schema: JSON.stringify(tool.function.parameters || {})
        };
      } else {
        // Anthropic: use direct properties
        return {
          ...tool,
          input_schema: JSON.stringify(tool.input_schema || {})
        };
      }
    }),
    hasHandlers: options.includeHandlers !== false,
  };
  
  // Render template
  return render(template, templateData);
};

export default generateCode;
