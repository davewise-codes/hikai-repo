# Repository Guidelines

## Project Structure & Module Organization
This pnpm/Turborepo mono enforces a `packages → apps` dependency flow: shared UI, tokens, fonts, and icons live in `packages/ui`, Tailwind presets in `packages/tailwind-config`, and Convex auth/plan helpers in `packages/convex`. Apps (`apps/website`, `apps/webapp`) focus on routing, local providers, and domain state while sourcing every component from `@hikai/*` exports.

## UI System & Component Workflow
Author reusable UI only in `packages/ui/src/components/ui` following the shadcn `forwardRef` + variant pattern. Re-export everything via `packages/ui/src/components/ui/index.ts`, centralize icons in `packages/ui/src/lib/icons.ts`, and adjust typography exclusively through `packages/ui/src/fonts/fonts.css` plus `packages/tailwind-config/index.js`. Consult `packages/ui/COMPONENT-GUIDELINES.md` and `packages/ui/DESIGN-TOKENS.md` so new primitives stay framework-agnostic and scalable before apps consume them.

## Build, Test & Development Commands
```bash
pnpm install                     # install workspace deps
pnpm dev                         # run all apps/packages in watch mode
pnpm build                       # turbo build pipeline
pnpm lint | pnpm lint:fix        # ESLint across the repo
pnpm --filter @hikai/ui test     # Vitest per package
pnpm turbo run build --filter=<target>  # scoped build
```

## Coding Style & Naming Conventions
Use TypeScript + React with tab indentation just like existing files. Keep imports ordered external → internal, rely on `cn` helpers instead of inline styles, and stick to semantic Tailwind tokens (`bg-primary`, `z-modal`, etc.). Apps never import fonts or icons from third parties—extend `packages/ui` and consume via `@hikai/ui`.

## Testing Guidelines
Vitest runs per package (`vitest.config.ts`). Name specs `*.test.ts(x)` beside the source, exercise hooks, Convex helpers, and UI variants (snapshots acceptable), and ensure `pnpm test && pnpm lint` passes before opening a PR or explain deviations.

## Commit & Pull Request Guidelines
Commits follow Conventional Commits with scoped subjects (`feat(convex): add plan limits`, `fix(webapp): hide admin menu`) written imperatively under ~72 chars. PRs must include a summary, linked Linear/Jira issue when relevant, screenshots for visual updates, and notes on tests or migrations while highlighting security-sensitive code paths.

## Security & Configuration Tips
Every Convex query/mutation begins with `assertOrgAccess` or `assertProductAccess`, enforces plan limits via `packages/convex/convex/lib/planLimits.ts`, and guards against removing the final admin. Apps change appearance only through their local theme providers backed by `Theme` exports from `@hikai/ui`. Secrets stay in each app’s `.env.local`.

## Reference Docs & READMEs
Use the root `README.md` for the architecture overview and this `AGENTS.md` for policy reminders. UI contributors should reread `packages/ui/COMPONENT-GUIDELINES.md`, `packages/ui/DESIGN-TOKENS.md`, and `packages/ui/src/fonts/fonts.css` before touching styling. Product context lives in `apps/webapp/doc/*.md` and planning material in `apps/webapp/webapp-plans`; each app’s `README.md` lists environment requirements.
