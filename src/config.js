import { readFileSync } from 'fs';
import { ValidationError } from './errors.js';

const DEFAULT_CONFIG = {
  templateDir: './templates',
  outputDir: './output',
  runtimeDir: './runtime'
};

export const loadConfig = (configPath) => {
  const content = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(content);

  // Validate required fields
  if (!config.name) {
    throw ValidationError('Config missing required field: name');
  }
  if (!config.type) {
    throw ValidationError('Config missing required field: type');
  }

  // Validate type
  if (config.type !== 'sse' && config.type !== 'stdio') {
    throw ValidationError(`Invalid type '${config.type}'. Must be 'sse' or 'stdio'`);
  }

  // Validate type-specific required fields
  if (config.type === 'sse' && !config.url) {
    throw ValidationError('SSE config requires url field');
  }
  if (config.type === 'stdio' && !config.command) {
    throw ValidationError('stdio config requires command field');
  }

  return { ...DEFAULT_CONFIG, ...config };
};

export { DEFAULT_CONFIG };
