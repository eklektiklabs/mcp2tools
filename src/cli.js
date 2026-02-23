#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// CLI entry point
import { McpError, ValidationError, EXIT_GENERATION_ERROR } from './errors.js';
import { loadConfig } from './config.js';
import { introspectMcpServer } from './introspect.js';
import { generateCode } from './generate.js';
import { generateDocs, copyConfig } from './docs.js';

const VALID_FLAGS = [
  'config',
  'configs',
  'output',
  'type',
  'typescript',
  'no-docs',
  'tools',
  'name',
  'force',
  'dry-run',
  'help',
  'verbose',
  'no-cache'
];

const VALID_SUBCOMMANDS = ['generate', 'help'];

export const parseArgs = (argv) => {
  const args = argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
    return {
      command: 'help',
      config: null,
      configs: null,
      output: null,
      type: 'anthropic',
      typescript: false,
      noDocs: false,
      tools: null,
      name: null,
      force: false,
      dryRun: false,
      verbose: false,
      noCache: false
    };
  }

  const command = args[0];
  
  if (!VALID_SUBCOMMANDS.includes(command)) {
    throw McpError(`Unknown subcommand: ${command}. Valid commands: ${VALID_SUBCOMMANDS.join(', ')}`);
  }

  if (command === 'help') {
    return {
      command: 'help',
      config: null,
      configs: null,
      output: null,
      type: 'anthropic',
      typescript: false,
      noDocs: false,
      tools: null,
      name: null,
      force: false,
      dryRun: false,
      verbose: false,
      noCache: false
    };
  }

  const result = {
    command,
    config: null,
    configs: null,
    output: null,
    type: 'anthropic',
    typescript: false,
    noDocs: false,
    tools: null,
    name: null,
    force: false,
    dryRun: false,
    verbose: false,
    noCache: false
  };

  const flagArgs = args.slice(1);
  
  for (let i = 0; i < flagArgs.length; i++) {
    const arg = flagArgs[i];
    // Handle -v shorthand
    if (arg === '-v') {
      result.verbose = true;
      continue;
    }
    if (!arg.startsWith('--')) {
      throw McpError(`Unknown argument: ${arg}. Flags must start with --`);
    }

    const flag = arg.slice(2);
    if (!VALID_FLAGS.includes(flag)) {
      throw McpError(`Unknown flag: --${flag}. Valid flags: ${VALID_FLAGS.map(f => '--' + f).join(', ')}`);
    }

    if (flag === 'typescript') {
      result.typescript = true;
      continue;
    }
    if (flag === 'no-docs') {
      result.noDocs = true;
      continue;
    }
    if (flag === 'force') {
      result.force = true;
      continue;
    }
    if (flag === 'dry-run') {
      result.dryRun = true;
      continue;
    }
    if (flag === 'verbose') {
      result.verbose = true;
      continue;
    }
    if (flag === 'no-cache') {
      result.noCache = true;
      continue;
    }

    if (flag === 'help') {
      result.command = 'help';
      continue;
    }

    if (i + 1 >= flagArgs.length) {
      throw McpError(`Missing value for --${flag}`);
    }

    const nextArg = flagArgs[i + 1];
    
    if (nextArg.startsWith('--')) {
      throw McpError(`Missing value for --${flag}`);
    }

    if (flag === 'config') {
      result.config = nextArg;
    } else if (flag === 'configs') {
      result.configs = nextArg.split(',').map(c => c.trim()).filter(c => c);
    } else if (flag === 'output') {
      result.output = nextArg;
    } else if (flag === 'type') {
      const validTypes = ['anthropic', 'openai'];
      if (!validTypes.includes(nextArg)) {
        throw McpError(`Invalid --type value: ${nextArg}. Valid values: ${validTypes.join(', ')}`);
      }
      result.type = nextArg;
    } else if (flag === 'tools') {
      result.tools = nextArg.split(',').map(t => t.trim()).filter(t => t);
    } else if (flag === 'name') {
      result.name = nextArg;
    }

    i++;
  }

  return result;
};

const validateArgs = (args) => {
  if (args.command === 'help') {
    return;
  }

  if (args.command === 'generate') {
    // Allow either --config (single) or --configs (multi)
    if (!args.config && !args.configs) {
      throw ValidationError('--config or --configs is required');
    }
    if (!args.output) {
      throw ValidationError('--output is required');
    }
  }
};

const printHelp = () => {
  console.log(`mcp-to-tools CLI
Usage: mcp-to-tools <command> [options]
Commands:
  generate    Generate MCP server tools
  help        Show this help message
  --config <path>     Path to MCP server config JSON (required for generate)
  --configs <paths>   Comma-separated paths to multiple MCP server configs
  --output <path>    Output directory (required for generate)
  --type <value>      Provider type: anthropic (default) or openai
  --typescript       Generate TypeScript instead of JavaScript
  --no-docs          Don't generate README.md
  --tools <names>    Comma-separated list of tool names to export
  --name <string>    Override name from config
  --force            Overwrite existing output files
  --dry-run          Preview without writing files
  -v, --verbose      Enable verbose output
  --no-cache         Disable caching
Example:
  mcp-to-tools generate --config ./mcp-config.json --output ./output --typescript
`);
};

const generateCommand = async (args) => {
  const { config, configs, output, type, typescript, noDocs, tools, name, force, dryRun, verbose, noCache } = args;
  // Debug output for testing
  console.log(`Command: ${args.command}`);
  console.log(`Config: ${config}`);
  console.log(`Configs: ${JSON.stringify(configs)}`);
  console.log(`Output: ${output}`);
  console.log(`Type: ${type}`);
  console.log(`TypeScript: ${typescript}`);
  console.log(`No Docs: ${noDocs}`);
  console.log(`Tools: ${JSON.stringify(tools)}`);
  console.log(`Name: ${name}`);
  console.log(`Force: ${force}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log(`Verbose: ${verbose}`);
  console.log(`No Cache: ${noCache}`);
  
  console.log('Generating MCP tools...');
  
  let loadedConfigs = [];
  let isMultiServer = false;
  
  // Handle multi-server mode (--configs flag)
  if (configs && configs.length > 0) {
    isMultiServer = true;
    for (const configPath of configs) {
      const loadedConfig = loadConfig(configPath);
      if (verbose) {
        console.debug(`[verbose] Config loaded: ${loadedConfig.name} (${loadedConfig.type})`);
      }
      loadedConfigs.push(loadedConfig);
    }
    console.log(`MCP Servers: ${loadedConfigs.map(c => c.name).join(', ')}`);
  } else {
    // Single server mode (--config flag)
    const loadedConfig = loadConfig(config);
    if (verbose) {
      console.debug(`[verbose] Config loaded: ${loadedConfig.name} (${loadedConfig.type})`);
      console.debug(`[verbose] Config details: ${JSON.stringify({ command: loadedConfig.command, args: loadedConfig.args, url: loadedConfig.url })}`);
    }
    
    // Override name if provided (single server only)
    if (name) {
      loadedConfig.name = name;
    }
    
    console.log(`MCP Server: ${loadedConfig.name} (${loadedConfig.type})`);
    loadedConfigs = [loadedConfig];
  }
  
  // Introspect MCP server(s)
  console.log('Introspecting MCP server(s)...');
  if (verbose) {
    console.debug(`[verbose] Attempting MCP server connection...`);
    console.debug(`[verbose] Connection options: ${JSON.stringify({ verbose, noCache })}`);
  }
  
  // Pass array for multi-server, single config for backward compatibility
  const serverConfig = isMultiServer ? loadedConfigs : loadedConfigs[0];
  let mcpTools = await introspectMcpServer(serverConfig, { verbose, noCache });
  
  // Filter tools if specified
  if (tools && tools.length > 0) {
    mcpTools = mcpTools.filter(t => tools.includes(t.name));
    console.log(`Filtered to ${mcpTools.length} tool(s)`);
  }
  
  console.log(`Found ${mcpTools.length} tool(s)`);
  if (verbose) {
    console.debug(`[verbose] Tool count after introspection: ${mcpTools.length}`);
    console.debug(`[verbose] Tools: ${mcpTools.map(t => t.name).join(', ')}`);
  }
  
  // Prepare output directory
  const outputDir = path.resolve(output);
  const ext = typescript ? 'ts' : 'js';
  const toolsFile = path.join(outputDir, `tools.${ext}`);
  const demoFile = path.join(outputDir, `demo.${ext}`);
  const configFile = path.join(outputDir, 'config.json');
  const readmeFile = path.join(outputDir, 'README.md');
  
  // Check for existing files (unless --force)
  if (!force && !dryRun) {
    if (fs.existsSync(toolsFile) || fs.existsSync(configFile)) {
      throw McpError(
        `Output directory already contains files. Use --force to overwrite`,
        'OUTPUT_EXISTS',
        EXIT_GENERATION_ERROR
      );
    }
  }
  
  // Use first config as primary for code generation (multi-server stores array in config.json)
  const primaryConfig = isMultiServer ? { name: 'multi-server', type: 'multi', servers: loadedConfigs.map(c => c.name) } : loadedConfigs[0];
  
  // Generate tools code
  const code = generateCode(mcpTools, primaryConfig, {
    templateName: typescript
      ? (type === 'openai' ? 'tools.openai.ts' : 'tools.ts')
      : (type === 'openai' ? 'tools.openai.js' : 'tools.js'),
    type: type,
    includeHandlers: true
  });
  
  // Generate demo code
  const demoCode = generateCode(mcpTools, primaryConfig, {
    templateName: typescript ? 'demo.ts' : 'demo.js',
    type: type,
    includeHandlers: true
  });
  
  // Generate docs
  const docs = noDocs ? null : generateDocs(mcpTools, primaryConfig);
  
  // Output plan
  const filesToWrite = [
    { path: toolsFile, content: code },
    { path: demoFile, content: demoCode },
    { path: configFile, content: JSON.stringify(isMultiServer ? { isMultiServer: true, servers: loadedConfigs } : loadedConfigs[0], null, 2) }
  ];
  
  if (docs) {
    filesToWrite.push({ path: readmeFile, content: docs });
  }
  
  if (dryRun) {
    console.log('\n--- DRY RUN ---');
    console.log(`Would write ${filesToWrite.length} file(s):`);
    for (const file of filesToWrite) {
      console.log(`  - ${path.relative(process.cwd(), file.path)}`);
    }
    return;
  }
  
  // Write files
  console.log(`\nWriting ${filesToWrite.length} file(s) to ${outputDir}...`);
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  for (const file of filesToWrite) {
    fs.writeFileSync(file.path, file.content, 'utf-8');
    if (verbose) {
      console.debug(`[verbose] Written: ${path.relative(process.cwd(), file.path)} (${file.content.length} bytes)`);
    }
  }
  
  console.log('\nDone!');
};

export const run = async (argv) => {
  try {
    const args = parseArgs(argv);
    validateArgs(args);

    if (args.command === 'help') {
      printHelp();
      return;
    }

    if (args.command === 'generate') {
      await generateCommand(args);
      return;
    }

    console.log('mcp-to-tools CLI');
    console.log('Command:', args.command);
  } catch (error) {
    if (error.name === 'McpError' || error.name === 'ValidationError') {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
};

const main = async () => {
  await run(process.argv);
};

export { main };

// Run if executed directly
main();
