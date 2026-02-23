# Multi-feature Implementation Plan

## TL;DR

> Add 4 features to mcp-to-tools CLI: verbose logging, tool caching, multi-server support, and streaming demo functions.
> 
> **Deliverables**:
> - `--verbose` / `-v` flag for debug output
> - Cached introspection in `~/.mcp-to-tools/cache/`
> - `--configs` flag for multi-server with namespace prefix
> - Streaming + non-streaming demo functions
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: CLI → Cache/Verbose → Multi-server → Streaming

---

## Context

### Original Request
User requested: streaming (2 functions), caching, verbose logging, multi-server support

### User Decisions (from Q&A)
- **Cache location**: Global (`~/.mcp-to-tools/cache/`)
- **Name conflicts**: Namespace prefix (`serverName_toolName`)
- **Anthropic streaming**: Mock streaming implementation

### Metis Review Findings
- Streaming definition needs clarity: OpenAI native streaming + Anthropic mock
- Multi-server config: use `--configs` flag with comma-separated paths
- Cache: tool definitions only, TTL 1 hour default, `--no-cache` flag

---

## Work Objectives

### Core Objective
Add 4 CLI features while preserving backward compatibility with existing single-server flow.

### Concrete Deliverables
- CLI flag: `--verbose` / `-v` and `--no-cache`
- Cache module: `src/cache.js` with file-based storage
- Multi-server: `--configs` flag accepting comma-separated config paths
- Demo templates: `runChatWithTools()` (non-streaming) + `runChatWithToolsStreaming()` (streaming)

### Definition of Done
- [ ] `mcp-to-tools generate --config x.json --output ./out --verbose` shows debug output
- [ ] Second run with same config shows "Using cached tools"
- [ ] `mcp-to-tools generate --configs a.json,b.json --output ./out` merges tools with namespace
- [ ] `demo.js` contains both streaming and non-streaming functions
- [ ] All existing tests pass (backward compatibility)

### Must Have
- Backward compatibility with single `--config` flag
- Cache invalidation via `--no-cache` flag
- Namespace prefix sanitization (hyphens → underscores)

### Must NOT Include
- Runtime client streaming (only generated demo code)
- Cache compression/encryption
- Load balancing or failover logic

---

## Verification Strategy

### Test Infrastructure
- **Framework**: node --test (existing)
- **No new test infrastructure needed**

### QA Policy
Every task includes agent-executed QA scenarios.

---

## Execution Strategy

### Wave 1 (Foundation)
```
Wave 1 - Core infrastructure:
├── Task 1: Add --verbose and --no-cache flags to CLI parser
├── Task 2: Create cache module (src/cache.js)
├── Task 3: Integrate cache with introspect function
└── Task 4: Add debug/verbose logging throughout CLI

Wave 2 - Features:
├── Task 5: Add --configs flag for multi-server
├── Task 6: Modify introspect for multi-server with namespace
├── Task 7: Update demo.js template with streaming function
├── Task 8: Update demo.ts template with streaming function
└── Task 9: Update tests for new flags + multi-server

Wave FINAL - Verification:
└── Task F1: Run all tests + verify new features work
```

### Dependency Matrix
- **Tasks 1-4**: Independent (Wave 1)
- **Task 5**: Depends on Task 1
- **Task 6**: Depends on Tasks 2, 3
- **Tasks 7-8**: Independent (can parallel)
- **Task 9**: Depends on all above

---

## TODOs

 [x] 1. Add --verbose and --no-cache flags to CLI parser

  **What to do**:
  - Add 'verbose' and 'no-cache' to VALID_FLAGS array in src/cli.js
  - Add verbose: false, noCache: false to default args
  - Parse -v and --verbose, --no-cache flags
  - Pass verbose and noCache to generateCommand

  **Must NOT do**:
  - Change existing flag behavior
  - Add new exit codes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple CLI flag addition, follows existing pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3, 4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - src/cli.js:81-143 - Existing flag parsing pattern

  **Acceptance Criteria**:
  - [ ] --verbose flag is recognized
  - [ ] --no-cache flag is recognized
  - [ ] Flags appear in help output

  **QA Scenarios**:
  - Scenario: Help shows new flags
    Tool: Bash
    Steps:
      1. node src/cli.js help
      2. Verify output contains --verbose
      3. Verify output contains --no-cache
    Expected Result: Both flags in help text
    Evidence: .sisyphus/evidence/task-1-help.txt

 [x] 2. Create cache module (src/cache.js)

  **What to do**:
  - Create src/cache.js with:
    - getCachePath() - returns ~/.mcp-to-tools/cache/
    - getCacheKey(configPath) - hash-based key from config
    - getCachedTools(key) - read from cache file
    - setCachedTools(key, tools, ttl) - write to cache file
    - Cache format: JSON with tools + timestamp
  - Default TTL: 1 hour (3600000ms)

  **Must NOT do**:
  - Add encryption or compression
  - Cache sensitive data

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file-based cache module
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 3, 4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - src/config.js - How config is loaded

  **Acceptance Criteria**:
  - [ ] Cache module exports getCachedTools, setCachedTools
  - [ ] Creates cache directory on first write

  **QA Scenarios**:
  - Scenario: Cache write and read
    Tool: Bash
    Steps:
      1. Create test cache: node -e "import('./src/cache.js').then(m => m.setCachedTools('test-key', [{name:'tool1'}], 60000))"
      2. Read cache: node -e "import('./src/cache.js').then(m => console.log(m.getCachedTools('test-key')))"
    Expected Result: Returns cached tools
    Evidence: .sisyphus/evidence/task-2-cache.txt

 [x] 3. Integrate cache with introspect function

  **What to do**:
  - Modify src/introspect.js:
    - Accept options: { verbose, noCache, cacheKey }
    - Check cache before introspecting
    - Store results in cache after successful introspection
    - Log cache hits/misses when verbose=true

  **Must NOT do**:
  - Change return type (still returns array)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Integration work, follows existing pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2, 4)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 6
  - **Blocked By**: Task 2

  **References**:
  - src/introspect.js - Existing introspect function

  **Acceptance Criteria**:
  - [ ] Introspect accepts noCache option
  - [ ] Returns cached tools when available and not expired
  - [ ] Logs "Using cached tools" when verbose + cache hit

  **QA Scenarios**:
  - Scenario: Cache hit returns cached data
    Tool: Bash
    Steps:
      1. Set cache manually
      2. Call introspect with verbose=true
      3. Verify "Using cached tools" in output
    Expected Result: Cache hit logged, no MCP server spawned
    Evidence: .sisyphus/evidence/task-3-cache-hit.txt

 [x] 4. Add debug/verbose logging throughout CLI

  **What to do**:
  - Add verbose logging in generateCommand:
    - Log config loading details
    - Log MCP server connection attempts
    - Log tool count after introspection
    - Log file write operations
  - Use console.debug() for verbose-only output

  **Must NOT do**:
  - Add verbose to user-facing error messages

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding console.debug calls
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 1, 2, 3)
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - src/cli.js:188-299 - generateCommand function

  **Acceptance Criteria**:
  - [ ] --verbose shows detailed operation logs
  - [ ] No verbose output without --verbose flag

  **QA Scenarios**:
  - Scenario: Verbose shows debug info
    Tool: Bash
    Steps:
      1. Run: node src/cli.js generate --config tests/fixtures/test-mcp-config.json --output /tmp/test-out --verbose
      2. Check for debug output
    Expected Result: Debug logs visible
    Evidence: .sisyphus/evidence/task-4-verbose.txt

- [ ] 5. Add --configs flag for multi-server

  **What to do**:
  - Add 'configs' to VALID_FLAGS
  - Allow either --config (single) or --configs (multiple, comma-separated)
  - If both provided, error or use --configs
  - Parse comma-separated paths

  **Must NOT do**:
  - Break existing --config behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CLI flag addition
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - src/cli.js - Flag parsing

  **Acceptance Criteria**:
  - [ ] --configs flag recognized
  - [ ] Accepts comma-separated paths

  **QA Scenarios**:
  - Scenario: --configs flag works
    Tool: Bash
    Steps:
      1. node src/cli.js help
      2. Verify --configs in help
    Expected Result: Flag documented
    Evidence: .sisyphus/evidence/task-5-help.txt

- [ ] 6. Modify introspect for multi-server with namespace

  **What to do**:
  - Modify introspect to accept array of configs
  - For each server:
    - Introspect tools
    - Prefix each tool name with {serverName}_
    - Sanitize: hyphens → underscores
  - Merge all tools into single array
  - Handle failures gracefully (continue on error)

  **Must NOT do**:
  - Change single-server behavior

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core logic change, needs care
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 3, 5

  **References**:
  - src/introspect.js - introspectMcpServer function

  **Acceptance Criteria**:
  - [ ] Multi-server config introspects all servers
  - [ ] Tools have namespace prefix
  - [ ] Single config still works (backward compat)

  **QA Scenarios**:
  - Scenario: Multi-server tools have prefixes
    Tool: Bash
    Steps:
      1. Create 2 test configs
      2. Run with --configs
      3. Check generated tools.js
    Expected Result: Tools prefixed with server names
    Evidence: .sisyphus/evidence/task-6-multi.txt

- [ ] 7. Update demo.js template with streaming function

  **What to do**:
  - Add runChatWithToolsStreaming() function:
    - OpenAI: Use stream: true parameter
    - Anthropic: Mock streaming with setInterval chunks
  - Keep existing runChatWithTools() as non-streaming
  - Add usage example at bottom

  **Must NOT do**:
  - Break existing non-streaming demo

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Template modification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 8)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - templates/demo.js.tmpl - Existing template

  **Acceptance Criteria**:
  - [ ] Generated demo.js has runChatWithToolsStreaming
  - [ ] OpenAI uses stream: true
  - [ ] Anthropic has mock streaming

  **QA Scenarios**:
  - Scenario: Generated demo has streaming
    Tool: Bash
    Steps:
      1. Generate demo with --type openai
      2. Check for stream: true
      3. Generate demo with --type anthropic
      4. Check for mock streaming
    Expected Result: Both have streaming function
    Evidence: .sisyphus/evidence/task-7-streaming.txt

- [ ] 8. Update demo.ts template with streaming function

  **What to do**:
  - Same as Task 7 but for TypeScript template
  - Add runChatWithToolsStreaming() to demo.ts.tmpl

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Template modification
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7)
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - templates/demo.ts.tmpl - Existing template

  **Acceptance Criteria**:
  - [ ] Generated demo.ts has runChatWithToolsStreaming

  **QA Scenarios**:
  - Scenario: Generated demo.ts has streaming
    Tool: Bash
    Steps:
      1. Generate demo.ts with --type openai --typescript
      2. Check for stream: true
    Expected Result: Streaming present
    Evidence: .sisyphus/evidence/task-8-streaming-ts.txt

- [ ] 9. Update tests for new flags + multi-server

  **What to do**:
  - Update tests/cli.test.js:
    - Add tests for --verbose flag parsing
    - Add tests for --no-cache flag parsing
    - Add tests for --configs flag parsing
    - Update expected outputs if needed

  **Must NOT do**:
  - Break existing tests

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Test updates
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 5

  **References**:
  - tests/cli.test.js - Existing tests

  **Acceptance Criteria**:
  - [ ] All new flags have tests
  - [ ] All tests pass

  **QA Scenarios**:
  - Scenario: All tests pass
    Tool: Bash
    Steps:
      1. node --test
    Expected Result: All pass
    Evidence: .sisyphus/evidence/task-9-tests.txt

---

## Final Verification Wave

- [ ] F1. All tests pass - `node --test`

---

## Commit Strategy

- Wave 1: `feat: add verbose logging and caching`
- Wave 2: `feat: add multi-server support and streaming demo`

---

## Success Criteria

### Verification Commands
```bash
node --test  # All tests pass
```
