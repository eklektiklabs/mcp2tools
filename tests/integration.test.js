import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Integration Tests', () => {
  let serverProcess;
  const SERVER_PORT = 3002;

  before(async () => {
    const serverPath = join(__dirname, 'fixtures', 'mock-mcp-server.js');
    serverProcess = spawn(process.execPath, [serverPath, String(SERVER_PORT)], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Server start timeout')), 5000);
      serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('Mock MCP server running')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      serverProcess.on('error', reject);
    });
  });

  after(() => {
    if (serverProcess && serverProcess.pid) {
      process.kill(serverProcess.pid, 'SIGTERM');
    }
  });

  it('should connect to mock MCP server and list tools', async () => {
    const { writeFile } = await import('fs/promises');
    const configPath = join(__dirname, 'fixtures', 'test-mcp-config.json');
    const config = {
      server: 'test-server',
      transport: 'http',
      url: `http://localhost:${SERVER_PORT}/mcp`
    };
    
    await writeFile(configPath, JSON.stringify(config, null, 2));

    const response = await fetch(`http://localhost:${SERVER_PORT}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      })
    });

    const result = await response.json();
    
    assert.strictEqual(result.jsonrpc, '2.0');
    assert.strictEqual(result.id, 1);
    assert.ok(result.result);
    assert.ok(Array.isArray(result.result.tools));
    assert.strictEqual(result.result.tools.length, 2);
    assert.strictEqual(result.result.tools[0].name, 'test-tool');
    assert.strictEqual(result.result.tools[1].name, 'calculate');
  });

  it('should call a tool on mock MCP server', async () => {
    const response = await fetch(`http://localhost:${SERVER_PORT}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: { message: 'hello', count: 3 }
        }
      })
    });

    const result = await response.json();
    
    assert.strictEqual(result.jsonrpc, '2.0');
    assert.strictEqual(result.id, 2);
    assert.ok(result.result);
    assert.ok(result.result.content);
    assert.strictEqual(result.result.content[0].text, 'Echo: hello');
  });

  it('should handle tool not found error', async () => {
    const response = await fetch(`http://localhost:${SERVER_PORT}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'nonexistent-tool',
          arguments: {}
        }
      })
    });

    const result = await response.json();
    
    assert.strictEqual(result.jsonrpc, '2.0');
    assert.strictEqual(result.id, 3);
    assert.ok(result.error);
    assert.strictEqual(result.error.code, -32601);
  });

  it('should perform calculate operations', async () => {
    const operations = [
      { op: 'add', a: 5, b: 3, expected: 8 },
      { op: 'subtract', a: 10, b: 4, expected: 6 },
      { op: 'multiply', a: 6, b: 7, expected: 42 },
      { op: 'divide', a: 20, b: 4, expected: 5 }
    ];

    for (const { op, a, b, expected } of operations) {
      const response = await fetch(`http://localhost:${SERVER_PORT}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.random(),
          method: 'tools/call',
          params: {
            name: 'calculate',
            arguments: { operation: op, a, b }
          }
        })
      });

      const result = await response.json();
      assert.ok(result.result);
      assert.strictEqual(
        result.result.content[0].text,
        `Result: ${expected}`
      );
    }
  });
});
