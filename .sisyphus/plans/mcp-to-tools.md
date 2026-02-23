# MCP to Tools - Work Plan

## TL;DR

> **Quick Summary**: CLI nástroj pro statickou konverzi MCP serverů na Anthropic API tool definitions. Introspektuje MCP server při build time a generuje JavaScript/TypeScript wrappery.
> 
> **Deliverables**:
> - CLI tool `mcp-to-tools` s příkazem `generate`
> - Runtime client (`mcp-to-tools/runtime/mcp-client.js`)
> - Generované soubory: tools.js/ts, config.json, README.md
> - Template systém pro code generation
> 
> **Estimated Effort**: Medium-Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: package.json → CLI core → MCP introspekce → Code generation → Integration tests

---

## Context

### Original Request
User chce vytvořit nástroj "MCP to Tools" podle specifikace v IDEA.md. Nástroj má řešit context bloat při použití MCP serverů s AI modely.

### Interview Summary
**Key Discussions**:
- Core functionality: MCP introspekce → Anthropic tool definitions
- Architecture: ES6 moduly, funkcionální styl (bez class syntaxe)
- Output: tools.js + config.json + README.md
- CLI interface s flags: --typescript, --no-docs, --tools, --name
- Zero runtime dependencies
- Test strategy: TDD s Node.js native test runner

### Metis Review
**Identified Gaps** (addressed):
- Exit codes: definovány (0=success, 1=config error, 2=connection error, 3=generation error)
- `--force` flag: přidán do CLI
- `--dry-run` flag: přidán do CLI
- Tool name sanitization: implementovat v convert.js
- Node.js version: předpokládáno 18+

---

## Work Objectives

### Core Objective
Vytvořit CLI nástroj, který:
1. Připojí se k MCP serveru (SSE nebo stdio)
2. Introspektuje dostupné nástroje (`tools/list`)
3. Konvertuje MCP schema na Anthropic tool definition
4. Generuje JavaScript/TypeScript wrapper kód
5. Vygeneruje dokumentaci (README.md)

### Concrete Deliverables
- `package.json` s binárním entry point
- CLI interface v `src/cli.js`
- MCP introspekce v `src/introspect.js`
- Schema konverze v `src/convert.js`
- Code generator v `src/generate.js`
- Template systém v `src/templates/`
- Runtime client v `runtime/mcp-client.js`
- Dokumentace generátor v `src/docs.js`
- Test fixtures v `tests/fixtures/`
- Test suite s TDD přístupem

### Definition of Done
- [ ] `mcp-to-tools generate --help` zobrazí nápovědu
- [ ] `mcp-to-tools generate --config <file> --output <dir>` generuje soubory
- [ ] Vygenerovaný `tools.js` je validní JavaScript (node --check)
- [ ] Vygenerovaný `tools.ts` kompiluje (pokud --typescript)
- [ ] Runtime client dokáže zavolat nástroj na reálném MCP serveru
- [ ] Všechny testy projdou (TDD workflow)

### Must Have
- [x] ES6 moduly, žádné class syntaxe
- [x] Zero runtime dependencies
- [x] SSE + stdio transport support
- [x] JSON Schema konverze MCP → Anthropic
- [x] Template-based code generation
- [x] CLI s flags: --config, --output, --typescript, --no-docs, --tools, --name, --force, --dry-run
- [x] Exit codes: 0=success, 1=config, 2=connection, 3=generation

### Must NOT Have (Guardrails)
- [ ] Runtime MCP připojení (pouze build-time)
- [ ] Multiple MCP servery v jednom config
- [ ] Watch mode / live reload
- [ ] MCP resources/prompts (pouze tools)
- [ ] Plugin systém
- [ ] Prettier/code formatting (pouze pokud explicitně požadováno)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (new project)
- **Automated tests**: YES (TDD approach)
- **Framework**: Node.js native test runner
- **Test Files**: `tests/**/*.test.js`
- **Fixtures**: `tests/fixtures/mock-mcp-server.js`

### QA Policy
Every task includes agent-executed QA scenarios:
- CLI commands: Bash (shell validation)
- Generated code: Bash (node --check, tsc --noEmit)
- Runtime: Interactive bash s stdio mock

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation + CLI):
├── Task 1: package.json + project scaffolding
├── Task 2: CLI argument parser (src/cli.js)
├── Task 3: Error handling + exit codes
├── Task 4: Basic CLI --help output
├── Task 5: Config file loader (src/config.js)
└── Task 6: Template engine (src/template.js)

Wave 2 (After Wave 1 — MCP introspekce):
├── Task 7: MCP protocol definitions (src/protocol.js)
├── Task 8: SSE client (src/clients/sse.js)
├── Task 9: Stdio client (src/clients/stdio.js)
├── Task 10: MCP introspector (src/introspect.js)
├── Task 11: Tool name sanitization (src/convert.js)
└── Task 12: JSON Schema converter (src/convert.js)

Wave 3 (After Wave 2 — code generation):
├── Task 13: Tools template (templates/tools.js.tmpl)
├── Task 14: TypeScript template (templates/tools.ts.tmpl)
├── Task 15: Handlers factory template
├── Task 16: Code generator (src/generate.js)
├── Task 17: Docs generator (src/docs.js)
└── Task 18: Config copier

Wave 4 (After Wave 3 — runtime + tests):
├── Task 19: Runtime MCP client (runtime/mcp-client.js)
├── Task 20: Runtime exports (runtime/index.js)
├── Task 21: Mock MCP server for tests (tests/fixtures/)
├── Task 22: Integration tests
└── Task 23: CLI full integration test

Wave FINAL (After ALL tasks — independent review):
├── Task F1: Plan compliance audit
├── Task F2: Code quality review
├── Task F3: Real manual QA
└── Task F4: Scope fidelity check
```

### Dependency Matrix
- **1-6**: — — 7-12
- **7**: 1 — 8, 9
- **8**: 1, 7 — 10
- **9**: 1, 7 — 10
- **10**: 5, 8, 9 — 11, 12
- **11**: 10 — 16
- **12**: 10 — 16
- **13-15**: 6 — 16
- **16**: 11, 12, 13, 14, 15 — 17, 18, 21
- **17**: 12 — 21
- **18**: 5 — 21
- **19**: 7 — 20
- **20**: 19 — 22
- **21**: 16, 17, 18 — 22, 23
- **22**: 20, 21 — F1-F4
- **23**: 22 — F1-F4

---

## TODOs

 [x] 1. Project scaffolding
 [x] 2. CLI argument parser

 [x] 3. Error handling + exit codes
 [x] 4. CLI --help output
 [x] 5. Config file loader
 [x] 6. Template engine
 [x] 7. MCP protocol definitions
 [x] 8. SSE client
 [x] 9. Stdio client
 [x] 10. MCP introspector
 [x] 11. Tool name sanitization
 [x] 12. JSON Schema converter
 [x] 13. Tools template
 [x] 14. TypeScript template
 [x] 15. Handlers factory template
 [x] 16. Code generator
 [x] 17. Docs generator
 [x] 18. Config copier
 [x] 19. Runtime MCP client
 [x] 20. Runtime exports
 [x] 21. Mock MCP server for tests
 [x] 22. Integration tests
 [x] 23. CLI full integration test
- [ ] F1. Plan compliance audit
- [ ] F2. Code quality review
- [ ] F3. Real manual QA
- [ ] F4. Scope fidelity check

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — Read the plan end-to-end. For each "Must Have": verify implementation exists.
- [ ] F2. **Code Quality Review** — Run tsc --noEmit + node --check. Review for: console.log, any types, unused imports.
- [ ] F3. **Real Manual QA** — Execute EVERY QA scenario from EVERY task.
- [ ] F4. **Scope Fidelity Check** — Verify 1:1 mapping between spec and implementation. Detect cross-task contamination.

---

## Commit Strategy

- **1**: `init: project scaffolding` — package.json, basic structure
- **2**: `feat(cli): argument parser and help` — src/cli.js, src/config.js
- **3**: `feat(mcp): protocol and clients` — src/protocol.js, src/clients/*
- **4**: `feat(convert): schema conversion` — src/introspect.js, src/convert.js
- **5**: `feat(generate): code generation` — src/generate.js, templates/*
- **6**: `feat(docs): documentation generator` — src/docs.js
- **7**: `feat(runtime): mcp client` — runtime/*
- **8**: `test: integration tests` — tests/*
- **FINAL**: `chore: final cleanup` — lint, format, tag

---

## Success Criteria

### Verification Commands
```bash
# CLI help
mcp-to-tools --help

# Generate command
mcp-to-tools generate --config tests/fixtures/mock-server.json --output /tmp/out

# Validate output
node --check /tmp/out/tools.js
node --check /tmp/out/config.json

# Run tests
node --test
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Generated code is valid JS/TS
