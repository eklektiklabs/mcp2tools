import { spawn } from 'child_process';
import { McpError, EXIT_CONNECTION_ERROR } from '../errors.js';
import { createMcpRequest, parseMcpResponse } from '../protocol.js';

/**
 * Creates a stdio client for MCP JSON-RPC communication over stdin/stdout.
 * @param {Object} config - Configuration object
 * @param {string} config.command - Command to spawn
 * @param {string[]} [config.args=[]] - Command arguments
 * @param {Object} [config.env={}] - Environment variables
 * @param {string} [config.cwd] - Working directory
 * @returns {Object} Stdio client with connect, disconnect, sendRequest methods
 */
export const createStdioClient = (config) => {
  const { command, args = [], env = {}, cwd } = config;

  if (!command) {
    throw McpError('Stdio client requires a command', 'INVALID_CONFIG', 1);
  }

  let childProcess = null;
  let connected = false;
  let requestId = 0;
  const pendingRequests = new Map();
  let messageHandler = null;
  let buffer = '';

  /**
   * Parse a complete JSON-RPC message from buffer
   * @returns {Object|null} Parsed message or null
   */
  const parseMessage = () => {
    const trimmed = buffer.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const message = JSON.parse(trimmed);
      buffer = '';
      return message;
    } catch {
      // Incomplete JSON, wait for more data
      return null;
    }
  };

  /**
   * Handle incoming data from stdout
   * @param {Buffer} data - Raw data from child process
   */
  const handleData = (data) => {
    buffer += data.toString();

    // Try to parse complete JSON-RPC messages
    // MCP uses newline-delimited JSON
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);
        if (messageHandler) {
          messageHandler(message);
        }

        // Handle response to a pending request
        if (message.id && pendingRequests.has(message.id)) {
          const { resolve, reject } = pendingRequests.get(message.id);
          pendingRequests.delete(message.id);

          if (message.error) {
            reject(new Error(message.error.message));
          } else {
            resolve(message.result);
          }
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  };

  /**
   * Handle process errors
   * @param {Error} err - Error from child process
   */
  const handleError = (err) => {
    connected = false;
    if (messageHandler) {
      messageHandler({ error: { code: -32000, message: err.message } });
    }
  };

  /**
   * Handle process exit
   * @param {number} code - Exit code
   */
  const handleExit = (code) => {
    connected = false;
    // Reject all pending requests
    for (const { reject } of pendingRequests.values()) {
      reject(McpError(
        `Process exited with code ${code}`,
        'PROCESS_EXITED',
        EXIT_CONNECTION_ERROR
      ));
    }
    pendingRequests.clear();
  };

  /**
   * Connect to the stdio subprocess
   * @returns {Promise<void>}
   */
  const connect = async () => {
    if (connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        childProcess = spawn(command, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...env },
          cwd,
          shell: true
        });

        childProcess.stdout.on('data', handleData);
        childProcess.stderr.on('data', (data) => {
          console.error(`[StdioClient stderr] ${data.toString()}`);
        });
        childProcess.on('error', handleError);
        childProcess.on('close', handleExit);

        // Give the process a moment to start
        setTimeout(() => {
          connected = true;
          resolve();
        }, 100);
      } catch (err) {
        reject(McpError(
          `Failed to spawn process: ${err.message}`,
          'SPAWN_ERROR',
          EXIT_CONNECTION_ERROR
        ));
      }
    });
  };

  /**
   * Disconnect from the stdio subprocess
   */
  const disconnect = () => {
    connected = false;
    buffer = '';

    if (childProcess) {
      childProcess.stdin.end();
      childProcess.kill();
      childProcess = null;
    }

    pendingRequests.clear();
  };

  /**
   * Set the message handler for incoming messages
   * @param {Function} handler - Handler function for messages
   */
  const onMessage = (handler) => {
    messageHandler = handler;
  };

  /**
   * Send a JSON-RPC request and wait for response
   * @param {string} method - MCP method name
   * @param {Object} [params={}] - Method parameters
   * @returns {Promise<Object>} Response result
   */
  const sendRequest = async (method, params = {}) => {
    if (!connected || !childProcess || !childProcess.stdin.writable) {
      throw McpError('Stdio client not connected', 'NOT_CONNECTED', EXIT_CONNECTION_ERROR);
    }

    const id = ++requestId;
    const request = createMcpRequest(method, params);
    request.id = id;

    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject });

      try {
        const messageStr = JSON.stringify(request) + '\n';
        childProcess.stdin.write(messageStr, (err) => {
          if (err) {
            pendingRequests.delete(id);
            reject(McpError(
              `Failed to write to stdin: ${err.message}`,
              'WRITE_ERROR',
              EXIT_CONNECTION_ERROR
            ));
          }
        });
      } catch (err) {
        pendingRequests.delete(id);
        reject(McpError(
          `Failed to send request: ${err.message}`,
          'SEND_ERROR',
          EXIT_CONNECTION_ERROR
        ));
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(McpError(
            `Request ${method} timed out`,
            'TIMEOUT',
            EXIT_CONNECTION_ERROR
          ));
        }
      }, 30000);
    });
  };

  /**
   * List available tools
   * @returns {Promise<Array>} List of available tools
   */
  const listTools = async () => {
    const result = await sendRequest('tools/list');
    return result.tools || [];
  };

  /**
   * Call a specific tool
   * @param {string} name - Tool name
   * @param {Object} [args={}] - Tool arguments
   * @returns {Promise<Object>} Tool execution result
   */
  const callTool = async (name, args = {}) => {
    const result = await sendRequest('tools/call', { name, arguments: args });
    return result;
  };

  return {
    connect,
    disconnect,
    sendRequest,
    onMessage,
    listTools,
    callTool,
    get isConnected() {
      return connected;
    }
  };
};

export default createStdioClient;
