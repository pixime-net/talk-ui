# talk-ui

TypeScript/React frontend for the talk project, following the **bmad** methodology.

> **Single source of truth**: TypeScript/ESLint rules, agent references, and skill catalog
> are all defined in `AGENTS.md`. This file imports it so Claude Code sees the same context
> as GitHub Copilot and OpenCode — without duplicating content.

## Agents, Skills Catalog & TypeScript Rules

@AGENTS.md

## Required TypeScript Skill

Always load the following skill from `.agents/skills/` when starting a TypeScript or React task.

- `.agents/skills/mastering-typescript/SKILL.md`
