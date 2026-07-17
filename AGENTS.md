# talk-ui

This project follows the **bmad** methodology. Skills, agents, and bmad artifacts are located in `../talk-bmad/`.

## bmad Agents (via `../talk-bmad/`)

| Agent       | File                                                          | Role             |
| ----------- | ------------------------------------------------------------- | ---------------- |
| Architect   | `../talk-bmad/.github/agents/bmad-agent-architect.agent.md`   | Technical design |
| Developer   | `../talk-bmad/.github/agents/bmad-agent-dev.agent.md`         | Implementation   |
| PM          | `../talk-bmad/.github/agents/bmad-agent-pm.agent.md`          | Epic management  |
| Analyst     | `../talk-bmad/.github/agents/bmad-agent-analyst.agent.md`     | Analysis         |
| Tech Writer | `../talk-bmad/.github/agents/bmad-agent-tech-writer.agent.md` | Documentation    |
| UX Designer | `../talk-bmad/.github/agents/bmad-agent-ux-designer.agent.md` | UX design        |

bmad agents reference their skills via `{project-root}/.agents/skills/` (i.e. `../talk-bmad/.agents/skills/` from this project).

## Local TypeScript Skills (`.agents/skills/`)

| Skill                  | Description                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `mastering-typescript` | Advanced TypeScript — types, generics, enterprise patterns, React integration, toolchain |

## TypeScript / ESLint Configuration

### tsconfig (via `tsconfig.app.json`)

Strict options enabled beyond `"strict": true`:

| Option                       | Impact                                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exactOptionalPropertyTypes` | `prop?: string` ≠ `prop: string \| undefined` — never explicitly assign `undefined` to an optional prop; use conditional spread `...(val !== undefined && { prop: val })` |
| `noUncheckedIndexedAccess`   | `arr[i]` returns `T \| undefined`                                                                                                                                         |
| `noUnusedLocals/Parameters`  | Error on any unused variable or parameter                                                                                                                                 |

### ESLint (`eslint.config.js`)

Active config: **`tseslint.configs.strictTypeChecked`** with `parserOptions.projectService`.

Key rules and enforced patterns:

| Rule                            | Correct pattern                                          |
| ------------------------------- | -------------------------------------------------------- |
| `no-confusing-void-expression`  | `onClick={() => { setState(x); }}` (braces required)     |
| `restrict-template-expressions` | `number` is allowed via `allowNumber: true`              |
| `no-base-to-string`             | Do not pass `unknown` to `String()` or template literals |
| `no-floating-promises`          | Always `void` or `await` unused promises                 |
| `no-misused-promises`           | Do not pass an `async` function where `void` is expected |
| `no-unnecessary-type-assertion` | Remove redundant casts (`as T` when already `T`)         |

Active overrides:

- **`.agents/**`, `**/*.js`, `**/*.mjs`** : ignored (assets, configs)
- **`src/**/*.test.{ts,tsx}`** : `unbound-method`, `no-unsafe-assignment`, `no-unnecessary-type-assertion` disabled (vitest incompatibility)
