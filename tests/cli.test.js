import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { describe, it } from 'node:test';
import assert from 'node:assert';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '..', 'src', 'cli.js');

const runCli = (args) => {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [CLI_PATH, ...args], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });
    
    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    
    proc.on('error', reject);
  });
};

describe('CLI Tests', () => {
  it('should show help when no arguments', async () => {
    const result = await runCli([]);
    
    assert.strictEqual(result.code, 0);
    assert.ok(result.stdout.includes('mcp-to-tools CLI'));
    assert.ok(result.stdout.includes('Usage:'));
    assert.ok(result.stdout.includes('Commands:'));
  });

  it('should show help with --help flag', async () => {
    const result = await runCli(['--help']);
    
    assert.strictEqual(result.code, 0);
    assert.ok(result.stdout.includes('mcp-to-tools CLI'));
    assert.ok(result.stdout.includes('Usage:'));
  });

  it('should show help with help command', async () => {
    const result = await runCli(['help']);
    
    assert.strictEqual(result.code, 0);
    assert.ok(result.stdout.includes('mcp-to-tools CLI'));
    assert.ok(result.stdout.includes('Usage:'));
  });

  it('should show error when config is missing for generate', async () => {
    const result = await runCli(['generate', '--output', './output']);
    
    assert.notStrictEqual(result.code, 0);
    assert.ok(result.stderr.includes('--config or --configs is required'));
  });

  it('should show error when output is missing for generate', async () => {
    const result = await runCli(['generate', '--config', './config.json']);
    
    assert.notStrictEqual(result.code, 0);
    assert.ok(result.stderr.includes('--output is required'));
  });

  it('should accept valid generate command with all flags', async () => {
    const result = await runCli([
      'generate',
      '--config', './config.json',
      '--output', './output',
      '--typescript',
      '--no-docs',
      '--tools', 'tool1,tool2',
      '--name', 'my-tools',
      '--force',
      '--dry-run'
    ]);
    
    // Note: Exit code may be non-zero if MCP server is not available
    // The key is that arguments are parsed correctly
    assert.ok(result.stdout.includes('Command: generate'));
    assert.ok(result.stdout.includes('Config: ./config.json'));
    assert.ok(result.stdout.includes('Output: ./output'));
    assert.ok(result.stdout.includes('TypeScript: true'));
    assert.ok(result.stdout.includes('No Docs: true'));
    assert.ok(result.stdout.includes('Tools: ["tool1","tool2"]'));
    assert.ok(result.stdout.includes('Name: my-tools'));
    assert.ok(result.stdout.includes('Force: true'));
    assert.ok(result.stdout.includes('Dry Run: true'));
  });

  it('should show error for unknown subcommand', async () => {
    const result = await runCli(['unknown']);
    
    assert.notStrictEqual(result.code, 0);
    assert.ok(result.stderr.includes('Unknown subcommand'));
  });

  it('should show error for unknown flag', async () => {
    const result = await runCli(['generate', '--config', './c.json', '--output', './o', '--unknown-flag']);
    
    assert.notStrictEqual(result.code, 0);
    assert.ok(result.stderr.includes('Unknown flag'));
  });

  it('should show error for missing flag value', async () => {
    const result = await runCli(['generate', '--config', '--output', './output']);
    
    assert.notStrictEqual(result.code, 0);
    assert.ok(result.stderr.includes('Missing value'));
  });

  it('should parse --tools with single tool', async () => {
    const result = await runCli(['generate', '--config', './c.json', '--output', './o', '--tools', 'only-one']);
    
    // Note: Exit code may be non-zero if MCP server is not available
    assert.ok(result.stdout.includes('Tools: ["only-one"]'));
  });

  it('should parse --tools with multiple tools', async () => {
    const result = await runCli(['generate', '--config', './c.json', '--output', './o', '--tools', 'one, two, three']);
    
    // Note: Exit code may be non-zero if MCP server is not available
    assert.ok(result.stdout.includes('Tools: ["one","two","three"]'));
  });

  it('should parse --verbose flag', async () => {
    const result = await runCli(['generate', '--config', './c.json', '--output', './o', '--verbose']);
    
    // Note: Exit code may be non-zero if MCP server is not available
    assert.ok(result.stdout.includes('Verbose: true'));
  });

  it('should parse -v shorthand for verbose', async () => {
    const result = await runCli(['generate', '--config', './c.json', '--output', './o', '-v']);
    
    // Note: Exit code may be non-zero if MCP server is not available
    assert.ok(result.stdout.includes('Verbose: true'));
  });

  it('should parse --no-cache flag', async () => {
    const result = await runCli(['generate', '--config', './c.json', '--output', './o', '--no-cache']);
    
    // Note: Exit code may be non-zero if MCP server is not available
    assert.ok(result.stdout.includes('No Cache: true'));
  });

  it('should parse --configs flag for multi-server', async () => {
    const result = await runCli(['generate', '--configs', './config1.json,./config2.json', '--output', './o']);
    
    // Note: Exit code may be non-zero if MCP server is not available
    assert.ok(result.stdout.includes('Configs: ["./config1.json","./config2.json"]'));
  });

  it('should allow both --verbose and --no-cache together', async () => {
    const result = await runCli(['generate', '--config', './c.json', '--output', './o', '--verbose', '--no-cache']);
    
    // Note: Exit code may be non-zero if MCP server is not available
    assert.ok(result.stdout.includes('Verbose: true'));
    assert.ok(result.stdout.includes('No Cache: true'));
  });
});
