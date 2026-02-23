import { McpError, EXIT_CONNECTION_ERROR } from '../errors.js';

export const createSseClient = (config) => {
  const { url, headers = {} } = config;

  if (!url) {
    throw McpError('SSE client requires a URL', 'INVALID_CONFIG', 1);
  }

  let connected = false;

  const parseSseData = (data) => {
    const lines = data.split('\n');
    let jsonData = '';
    for (const line of lines) {
      if (line.startsWith('data:')) {
        jsonData = line.slice(5).trim();
        break;
      }
    }
    if (!jsonData) return null;
    try {
      return JSON.parse(jsonData);
    } catch {
      return null;
    }
  };

  const connect = async () => {
    connected = true;
  };

  const disconnect = () => {
    connected = false;
  };

  const sendRequest = async (method, params = {}) => {
    if (!connected) {
      throw McpError('SSE client not connected', 'NOT_CONNECTED', EXIT_CONNECTION_ERROR);
    }

    const id = Math.floor(Math.random() * 1000000);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        ...headers
      },
      body: JSON.stringify({ 
        jsonrpc: '2.0', 
        method, 
        params, 
        id 
      })
    });

    if (!response.ok) {
      throw McpError(
        `Request failed: ${response.status} ${response.statusText}`,
        'REQUEST_ERROR',
        EXIT_CONNECTION_ERROR
      );
    }

    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('text/event-stream')) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        
        for (const event of events) {
          const message = parseSseData(event);
          if (message && message.id === id) {
            if (message.error) {
              throw new Error(message.error.message);
            }
            return message.result;
          }
        }
      }
      
      throw new Error('Request timed out');
    }
    
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }
    return data.result;
  };

  const listTools = async () => {
    const result = await sendRequest('tools/list');
    return result.tools || [];
  };

  const callTool = async (name, args = {}) => {
    const result = await sendRequest('tools/call', { name, arguments: args });
    return result;
  };

  return {
    connect,
    disconnect,
    sendRequest,
    onMessage: () => {},
    listTools,
    callTool,
    get isConnected() {
      return connected;
    }
  };
};

export default createSseClient;
