export const EXIT_SUCCESS = 0;
export const EXIT_CONFIG_ERROR = 1;
export const EXIT_CONNECTION_ERROR = 2;
export const EXIT_GENERATION_ERROR = 3;

export const McpError = (message, code = 'MCP_ERROR', exitCode = EXIT_GENERATION_ERROR) => {
  const err = new Error(message);
  err.code = code;
  err.name = 'McpError';
  err.exitCode = exitCode;
  return err;
};

export const ValidationError = (message, exitCode = EXIT_CONFIG_ERROR) => {
  const err = new Error(message);
  err.name = 'ValidationError';
  err.exitCode = exitCode;
  return err;
};

export const handleError = (err) => {
  console.error(`Error: ${err.message}`);
  process.exit(err.exitCode ?? EXIT_GENERATION_ERROR);
};
