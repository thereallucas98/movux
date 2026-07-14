# Development Workflow

**Build features with Claude Code using a phased approach**

---

## How to Start a Feature

### Step 1: Clarify
Describe what you want to build. Claude will explore the codebase, ask clarifying questions, and generate a task brief.

### Step 2: Approve Plan
Claude explores, researches, and creates a plan. Review and approve before execution.

### Step 3: Execute
Claude writes the code. Each sub-step includes QA validation.

### Step 4: Review & Commit
Review changes, run browser QA checklist, then commit.

---

## The 6-Phase Workflow

```
Phase 0: Clarify    → Define scope, acceptance criteria
Phase 1: Explore    → Read existing code, identify integration points
Phase 2: Research   → Analyze approach options, make decisions
Phase 3: Plan       → Create plan + todo → YOU APPROVE
Phase 4: Execute    → Write code, lint, build
Phase 5: Validate   → Browser QA checklist, commit
```

**Every task must produce 6 docs:**
1. `brief.md` — User story, scope, acceptance criteria
2. `exploration.md` — Current state, key files, risks
3. `research.md` — Decision analysis
4. `plan.md` — Ordered sub-steps
5. `todo.md` — Granular checklist
6. `validation.md` — QA results, browser checklist

---

## Commands

```bash
# Development
pnpm dev              # Dev server (port 3001)
pnpm build            # Production build
pnpm lint             # tsc + ESLint (0 warnings)
pnpm lint-fix         # Auto-fix
pnpm prettier-format  # Format
pnpm codegen          # Generate GraphQL types

# Database
cd apps/web && pnpm db:migrate   # Run migrations
pnpm db:generate                  # Generate Prisma client
pnpm db:studio                    # Prisma Studio UI

# Docker
docker compose up -d              # Start PostgreSQL
```

---

## Project Structure

```
docs/
  README.md                       (this file)
  CLAUDE-INSTRUCTIONS.md          (AI workflow instructions)
  API-ARCHITECTURE.md             (backend patterns)
  _templates/                     (task document templates)
  tasks/<feature-slug>/           (task documentation per feature)
    brief.md
    exploration.md
    research.md
    plan.md
    todo.md
    validation.md
```

---

## Commit Message Format

```
<type>: <description>
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`

---

## For Claude: AI Instructions

Read: **[CLAUDE-INSTRUCTIONS.md](CLAUDE-INSTRUCTIONS.md)**
