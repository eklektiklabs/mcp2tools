# MCP-to-Tools Learnings

## Task 2: CLI Argument Parser

### Pattern: Native CLI Parsing
- Used native string parsing without external dependencies
- Implemented manual flag detection with `startsWith('--')` 
- Used array index tracking for flag values

### Edge Cases Handled
1. Missing required values for flags (throws McpError)
2. Unknown flags (throws McpError)
3. Unknown subcommands (throws McpError)
4. Missing required flags `--config` and `--output` for generate command (throws ValidationError)
5. Comma-separated values for `--tools` flag (splits and trims)

### Exported Functions
- `parseArgs(argv)` - Parses CLI arguments, returns object with all flags
- `run(argv)` - Main CLI runner with validation
- `main` - Entry point for direct execution

### CLI Flags Implemented
- `generate` subcommand
- `--config <path>` (required)
- `--output <path>` (required)  
- `--typescript` (boolean)
- `--no-docs` (boolean)
- `--tools <names>` (comma-separated array)
- `--name <string>`
- `--force` (boolean)
- `--dry-run` (boolean)
- `help` subcommand
