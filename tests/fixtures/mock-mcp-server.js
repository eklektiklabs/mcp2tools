import http from 'http';

const SAMPLE_TOOLS = [
  {
    name: 'test-tool',
    description: 'A test tool for unit testing',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to echo back'
        },
        count: {
          type: 'number',
          description: 'Number of times to repeat'
        }
      },
      required: ['message']
    }
  },
  {
    name: 'calculate',
    description: 'Perform basic arithmetic calculations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide'],
          description: 'Mathematical operation'
        },
        a: { type: 'number', description: 'First operand' },
        b: { type: 'number', description: 'Second operand' }
      },
      required: ['operation', 'a', 'b']
    }
  }
];

const readJsonMessage = (data) => {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

const handleRequest = (message) => {
  const { method, id, params } = message;

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: SAMPLE_TOOLS
      }
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    
    if (name === 'test-tool') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: `Echo: ${args.message}`
            }
          ]
        }
      };
    }

    if (name === 'calculate') {
      let result;
      switch (args.operation) {
        case 'add': result = args.a + args.b; break;
        case 'subtract': result = args.a - args.b; break;
        case 'multiply': result = args.a * args.b; break;
        case 'divide': result = args.b !== 0 ? args.a / args.b : 'Error: division by zero'; break;
        default: result = 'Unknown operation';
      }
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: `Result: ${result}`
            }
          ]
        }
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Tool not found: ${name}`
      }
    };
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Method not found: ${method}`
    }
  };
};

const startHttpServer = (port = 3000) => {
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/mcp') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const message = readJsonMessage(body);
        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }));
          return;
        }
        
        const response = handleRequest(message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    console.log(`Mock MCP server running on http://localhost:${port}/mcp`);
  });

  return server;
};

const startStdioServer = () => {
  let buffer = '';
  
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    
    for (const line of lines) {
      if (line.trim()) {
        const message = readJsonMessage(line);
        if (message) {
          const response = handleRequest(message);
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      }
    }
  });
};

if (process.argv.includes('--stdio')) {
  startStdioServer();
} else {
  const port = parseInt(process.argv[process.argv.length - 1]) || 3000;
  if (!isNaN(port)) {
    startHttpServer(port);
  }
}

export { startHttpServer, startStdioServer, SAMPLE_TOOLS, handleRequest };
