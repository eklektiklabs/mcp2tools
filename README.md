# MCP to Tools

CLI tool for static conversion of MCP servers to Anthropic/OpenAI API tool definitions. Introspects MCP servers at build time and generates JavaScript/TypeScript wrappers.

## Installation

```bash
npm install -g mcp-to-tools
```

## Usage

```bash
mcp-to-tools generate --config <path> --output <path> [options]
```

### Options

| Flag | Description |
|------|-------------|
| `--config <path>` | Path to MCP server config JSON (required) |
| `--configs <paths>` | Comma-separated paths to multiple MCP configs |
| `--output <path>` | Output directory (required) |
| `--type <value>` | Provider type: `anthropic` (default) or `openai` |
| `--typescript` | Generate TypeScript instead of JavaScript |
| `--no-docs` | Don't generate README.md |
| `--tools <names>` | Comma-separated list of tool names to export |
| `--name <string>` | Override name from config |
| `--force` | Overwrite existing output files |
| `--dry-run` | Preview without writing files |
| `-v, --verbose` | Enable verbose output |
| `--no-cache` | Disable caching |

### Examples

```bash
# Basic usage
mcp-to-tools generate --config ./mcp-config.json --output ./output

# Generate TypeScript
mcp-to-tools generate --config ./mcp-config.json --output ./output --typescript

# Filter specific tools
mcp-to-tools generate --config ./mcp-config.json --output ./output --tools tool1,tool2

# Generate OpenAI format
mcp-to-tools generate --config ./mcp-config.json --output ./output --type openai

# Generate TypeScript with OpenAI format
mcp-to-tools generate --config ./mcp-config.json --output ./output --type openai --typescript

# Multi-server (tools prefixed with server name)
mcp-to-tools generate --configs ./config1.json,./config2.json --output ./output

# Verbose output
mcp-to-tools generate --config ./mcp-config.json --output ./output --verbose

# Disable caching
mcp-to-tools generate --config ./mcp-config.json --output ./output --no-cache
```

## Configuration

MCP server config JSON format:

```json
{
  "name": "my-server",
  "type": "sse",
  "url": "https://example.com/mcp"
}
```

Or for stdio:

```json
{
  "name": "my-server",
  "type": "stdio",
  "command": "npx",
  "args": ["my-mcp-server"]
}
```

## Output

Generates:
 `tools.js` / `tools.ts` - Tool definitions and handlers
 `demo.js` / `demo.ts` - Chat completion demo with tool call handling (includes streaming & non-streaming functions)
 `config.json` - Copied configuration
 `README.md` - Documentation (unless `--no-docs`)

## API

### Runtime Client

```javascript
import { createClient } from 'mcp-to-tools/runtime';

const client = createClient({
  type: 'stdio',
  command: 'npx',
  args: ['my-mcp-server']
});

await client.connect();
const tools = await client.listTools();
const result = await client.callTool('tool-name', { arg: 'value' });
await client.disconnect();
```

## Development

```bash
# Run tests
node --test

# Run CLI
node src/cli.js --help
```

## Exit Codes

- `0` - Success
- `1` - Config error
- `2` - Connection error
- `3` - Generation error
