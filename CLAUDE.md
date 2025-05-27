# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PostgreSQL タグ管理パフォーマンス比較プロジェクト - A benchmarking project comparing three approaches for managing person + tag relationships in PostgreSQL:

1. **Normalized**: Traditional relational design with Person, Tag, and PersonTag tables
2. **JSONB**: Using JSONB column with GIN index  
3. **Array**: Using TEXT[] with GIN index

The benchmark tests search performance (single tag, AND/OR queries) and write performance (single/batch inserts, updates) with 10,000 people and 5 tags.

## Package Management

- Uses pnpm as package manager (version 10.11.0)
- Workspace configuration in pnpm-workspace.yaml

## Development Commands

- **Linting/Formatting**: `pnpm biome check` and `pnpm biome format` (Biome is configured in biome.json)
- Planned commands from requirements.md:
  - `npm run setup`: Reset and setup database with Prisma
  - `npm run benchmark`: Run full benchmark suite  
  - `npm run benchmark:search`: Search performance only
  - `npm run benchmark:write`: Write performance only
  - `npm run dev`: Development execution with tsx

## Tech Stack

- TypeScript + Node.js with tsx runtime
- Prisma ORM for database access
- PostgreSQL 15 (Docker)
- Biome for linting and formatting