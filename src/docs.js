import fs from 'fs';
import path from 'path';
import { convertTools } from './convert.js';

/**
 * Generates README.md documentation from tools and config
 * @param {Array} tools - Array of MCP tool definitions
 * @param {Object} config - Configuration object
 * @returns {string} Generated README.md content
 */
export const generateDocs = (tools, config) => {
  const convertedTools = convertTools(tools);
  const lines = [];
  
  lines.push('# MCP Tools');
  lines.push('');
  
  if (config.name) {
    lines.push(`**${config.name}**`);
    lines.push('');
  }
  
  if (config.description) {
    lines.push(config.description);
    lines.push('');
  }
  
  if (config.version) {
    lines.push(`Version: ${config.version}`);
    lines.push('');
  }
  
  lines.push('## Tools');
  lines.push('');
  
  for (const tool of convertedTools) {
    lines.push(`### ${tool.name}`);
    lines.push('');
    lines.push(tool.description || '*No description*');
    lines.push('');
    
    if (tool.input_schema && Object.keys(tool.input_schema).length > 0) {
      lines.push('**Parameters:**');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(tool.input_schema, null, 2));
      lines.push('```');
      lines.push('');
    }
  }
  
  return lines.join('\n');
};

/**
 * Copies config to output path
 * @param {Object} config - Configuration object
 * @param {string} outputPath - Output file path
 * @returns {boolean} Success status
 */
export const copyConfig = (config, outputPath) => {
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
};

export default { generateDocs, copyConfig };
