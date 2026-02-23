# Plan: OpenAI Support & Demo Generation

## TL;DR

> Add OpenAI API tool format support and demo.js scaffold showing chat completion with tool calls.
> 
> **Deliverables**:
> - `--type` CLI flag (anthropic/openai)
> - OpenAI tool conversion function
> - OpenAI format templates
> - demo.js template with chat completion scaffolding
> 
> **Estimated Effort**: Short
> **Parallel Execution**: NO - sequential, 5 tasks
> **Critical Path**: Task 1 → 2 → 3 → 4 → 5

---

## Context

### Original Request
Add two features:
1. Generate tools also according to OpenAI API rules (switch `--type anthropic` or `--type openai`)
2. Scaffold for handling these tool calls in API, i.e., put demo.js in output with simple chat completion call (openai / anthropic) with tool call handling

### Current State
- CLI exists with flags: --config, --output, --typescript, --no-docs, --tools, --name, --force, --dry-run, --help
- Tools generated in Anthropic format: `{ name, description, input_schema: {...} }`
- Templates in `templates/tools.js.tmpl` and `templates/tools.ts.tmpl`

### Key Technical Difference
- **Anthropic**: `{ name, description, input_schema: {...} }`
- **OpenAI**: `{ type: 'function', function: { name, description, parameters: {...} } }`

---

## Work Objectives

### Core Objective
Add `--type openai` flag that generates tools in OpenAI format, plus demo.js showing chat completion with tool handling.

### Concrete Deliverables
- CLI accepts `--type openai` or `--type anthropic` (default: anthropic)
- OpenAI format tools generated when --type openai
- demo.js generated with API call scaffolding

### Must Have
- `--type` flag with validation (anthropic/openai only)
- OpenAI tool format correctly formatted
- Demo shows tool call handling loop

### Must NOT Have
- Breaking changes to existing --type behavior (default remains anthropic)
- Additional runtime dependencies

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Node.js test runner)
- **Automated tests**: YES (tests-after)
- **Framework**: Node.js native test runner

### QA Policy
Every task includes agent-executed verification via:
- CLI command testing
- Output file verification

---

## Execution Strategy

### Sequential Tasks (5 tasks)

```
Task 1: Add --type flag to CLI
  - Add to VALID_FLAGS
  - Add to parseArgs
  - Add to validateArgs
  - Add to generateCommand
  - Update help text

Task 2: Add OpenAI conversion function
  - Add convertToOpenAITool to convert.js
  - Add convertToolsByType export
  - Test conversion output

Task 3: Update generate.js for type support
  - Pass type to template data
  - Select template based on type

Task 4: Create OpenAI templates
  - templates/tools.openai.js.tmpl
  - templates/tools.openai.ts.tmpl

Task 5: Create demo.js template
  - templates/demo.js.tmpl
  - Generate demo.js in output
  - Show tool call handling loop
```

---

## TODOs

---

- [x] 1. Add `--type` flag to CLI

  **What to do**:
  - Add `'type'` to VALID_FLAGS array in src/cli.js
  - Add `type: 'anthropic'` as default in parseArgs return objects
  - Add flag parsing for --type with value validation (anthropic/openai only)
  - Pass type to generateCommand
  - Update printHelp to show --type option

  **Must NOT do**:
  - Change default behavior (anthropic remains default)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple CLI flag addition, straightforward modification
  - **Skills**: []
  - **Skills Evaluated but Omitted**: N/A

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `src/cli.js:12-22` - VALID_FLAGS array pattern
  - `src/cli.js:90-105` - Flag parsing examples (typescript, no-docs, force)

  **Acceptance Criteria**:
  - [ ] CLI accepts `--type openai` without error
  - [ ] CLI accepts `--type anthropic` without error
  - [ ] CLI rejects invalid type with error message
  - [ ] Help text shows --type option

  **QA Scenarios**:

  ```
  Scenario: Valid --type flag (openai)
    Tool: Bash
    Preconditions: CLI built
    Steps:
      1. Run: node src/cli.js generate --config ./mcp.json --output /tmp/test --type openai --dry-run
    Expected Result: Shows "Would write" message, no error about unknown flag
    Evidence: /tmp/test/tools.js (or dry-run output)

  Scenario: Valid --type flag (anthropic)
    Tool: Bash
    Preconditions: CLI built
    Steps:
      1. Run: node src/cli.js generate --config ./mcp.json --output /tmp/test --type anthropic --dry-run
    Expected Result: Works without error
    Evidence: /tmp/test/tools.js (or dry-run output)

  Scenario: Invalid --type flag
    Tool: Bash
    Preconditions: CLI built
    Steps:
      1. Run: node src/cli.js generate --config ./mcp.json --output /tmp/test --type invalid
    Expected Result: Error message about invalid type
    Evidence: stderr output
  ```

  **Commit**: YES
  - Message: `feat(cli): add --type flag for OpenAI/Anthropic format selection`
  - Files: `src/cli.js`

---

- [x] 2. Add OpenAI conversion function

  **What to do**:
  - Add convertToOpenAITool function to src/convert.js
  - Transform: `{ name, description, input_schema }` → `{ type: 'function', function: { name, description, parameters } }`
  - Add convertToolsByType export that routes to correct converter
  - Update generate.js to use convertToolsByType

  **Must NOT do**:
  - Break existing Anthropic conversion

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple function addition with clear spec
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `src/convert.js:23-32` - convertToAnthropicTool pattern to follow
  - OpenAI function tool format: `{ type: 'function', function: { name, description, parameters } }`

  **Acceptance Criteria**:
  - [ ] convertToOpenAITool returns correct OpenAI format
  - [ ] convertToolsByType returns Anthropic tools when type='anthropic'
  - [ ] convertToolsByType returns OpenAI tools when type='openai'
  - [ ] Existing Anthropic tests still pass

  **QA Scenarios**:

  ```
  Scenario: OpenAI tool conversion
    Tool: Bash
    Preconditions: Node.js environment
    Steps:
      1. Run: node -e "import { convertToolsByType } from './src/convert.js'; const tools = [{name: 'test', description: 'test desc', inputSchema: {type: 'object', properties: {q: {type: 'string'}}}}]; console.log(JSON.stringify(convertToolsByType(tools, 'openai'), null, 2))"
    Expected Result: Output contains type: 'function' and function.name, function.parameters
    Evidence: stdout

  Scenario: Anthropic tool conversion (backward compatibility)
    Tool: Bash
    Preconditions: Node.js environment
    Steps:
      1. Run: node -e "import { convertToolsByType } from './src/convert.js'; const tools = [{name: 'test', description: 'test desc', inputSchema: {type: 'object'}}]; console.log(JSON.stringify(convertToolsByType(tools, 'anthropic'), null, 2))"
    Expected Result: Output contains name, description, input_schema (not wrapped in function)
    Evidence: stdout
  ```

  **Commit**: YES
  - Message: `feat(convert): add OpenAI tool format conversion`
  - Files: `src/convert.js`

---

- [x] 3. Update generate.js for type support

  **What to do**:
  - Import convertToolsByType from convert.js
  - Pass type to template data
  - Select template based on type: 'tools.js' vs 'tools.openai.js'

  **Must NOT do**:
  - Change default behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small modification to existing function
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 4
  - **Blocked By**: Task 2

  **References**:
  - `src/generate.js:22-23` - convertTools call location
  - `src/generate.js:26-34` - templateData structure

  **Acceptance Criteria**:
  - [ ] generateCode accepts type option
  - [ ] Template receives type in data
  - [ ] Different templates loaded based on type

  **QA Scenarios**:

  ```
  Scenario: Generate with type=anthropic
    Tool: Bash
    Preconditions: CLI built
    Steps:
      1. Run: node src/cli.js generate --config ./mcp.json --output /tmp/test --type anthropic --dry-run
    Expected Result: Uses anthropic template format
    Evidence: dry-run output shows tools.js

  Scenario: Generate with type=openai
    Tool: Bash
    Preconditions: CLI built
    Steps:
      1. Run: node src/cli.js generate --config ./mcp.json --output /tmp/test --type openai --dry-run
    Expected Result: Uses OpenAI template format
    Evidence: dry-run output
  ```

  **Commit**: YES
  - Message: `feat(generate): support type parameter for OpenAI format`
  - Files: `src/generate.js`

---

- [x] 4. Create OpenAI templates

  **What to do**:
  - Create templates/tools.openai.js.tmpl with OpenAI format
  - Create templates/tools.openai.ts.tmpl with TypeScript variant
  - Structure: `{ type: 'function', function: { name, description, parameters } }`

  **Must NOT do**:
  - Break existing anthropic templates

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Template file creation following existing pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 5
  - **Blocked By**: Task 3

  **References**:
  - `templates/tools.js.tmpl` - Pattern to follow
  - `templates/tools.ts.tmpl` - TypeScript pattern

  **Acceptance Criteria**:
  - [ ] tools.openai.js.tmpl generates valid OpenAI function format
  - [ ] tools.openai.ts.tmpl generates valid TypeScript with OpenAI format

  **QA Scenarios**:

  ```
  Scenario: OpenAI JS template generates correct format
    Tool: Bash
    Preconditions: Template created
    Steps:
      1. Create test template data: tools=[{name:'test',description:'desc',input_schema:{type:'object'}}]
      2. Run generate with openai template
    Expected Result: Output has type:'function', function:{name,description,parameters}
    Evidence: Generated file content
  ```

  **Commit**: YES
  - Message: `feat(templates): add OpenAI format templates`
  - Files: `templates/tools.openai.js.tmpl`, `templates/tools.openai.ts.tmpl`

---

- [x] 5. Create demo.js template

  **What to do**:
  - Create templates/demo.js.tmpl
  - Show chat completion call with tools parameter
  - Show tool call handling loop for both OpenAI and Anthropic
  - Include placeholder API key and base URL
  - Generate demo.js in output alongside tools.js

  **Must NOT do**:
  - Hardcode actual API keys

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Template creation with scaffold code
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: Task 4

  **References**:
  - `templates/tools.js.tmpl` - Template syntax pattern

  **Acceptance Criteria**:
  - [ ] demo.js.tmpl created
  - [ ] Demo generated when --type is specified
  - [ ] Demo shows API call with tools
  - [ ] Demo shows tool call handling loop

  **QA Scenarios**:

  ```
  Scenario: Demo generated with generate command
    Tool: Bash
    Preconditions: CLI built with demo generation
    Steps:
      1. Run: node src/cli.js generate --config ./mcp.json --output /tmp/test --type openai --dry-run
    Expected Result: Shows demo.js in output list
    Evidence: dry-run output

  Scenario: Demo contains tool call handling
    Tool: Bash
    Preconditions: Demo generated
    Steps:
      1. Check generated demo.js content
    Expected Result: Contains API call with tools, contains while loop for tool_calls
    Evidence: File content
  ```

  **Commit**: YES
  - Message: `feat(demo): add demo.js template with chat completion scaffolding`
  - Files: `templates/demo.js.tmpl`, `src/cli.js` (update generateCommand)

---

## Final Verification Wave

- [x] F1. **Full CLI test** — Run complete generate with --type openai and verify all files
- [x] F2. **Format validation** — Verify OpenAI tools output matches official format
- [x] F3. **Demo functionality** — Verify demo.js is syntactically valid and shows correct patterns

---

## Commit Strategy

- Task 1: `feat(cli): add --type flag for OpenAI/Anthropic format selection`
- Task 2: `feat(convert): add OpenAI tool format conversion`
- Task 3: `feat(generate): support type parameter for OpenAI format`
- Task 4: `feat(templates): add OpenAI format templates`
- Task 5: `feat(demo): add demo.js template with chat completion scaffolding`

---

## Success Criteria

- [x] `--type openai` generates valid OpenAI function format
- [x] `--type anthropic` generates valid Anthropic format (backward compatible)
- [x] demo.js generated with tool call handling scaffold
- [x] All existing tests pass
