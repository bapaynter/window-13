# AGENTS.md

Window 13 — a Nuxt 4 game where you review an infernal soul-contract and try to catch its literal-reading trap before signing. All game logic is server-side; the client renders and drives it.

## Commands

- `npm install` — `postinstall` runs `nuxt prepare`.
- `npm run dev` — dev server. If port 3000 is taken Nuxt picks another and binds IPv6 localhost, so probe `http://localhost:<port>/`, not `127.0.0.1`.
- `npm test` — `vitest run` (all tests). One file: `npx vitest run test/meters.test.ts`. One test: add `-t "name"`.
- `npm run typecheck` — `nuxt typecheck`. There is **no ESLint**; this is the only static gate, so run it after edits.
- `npm run build` / `npm run preview`.

## Setup

- Requires `OPENROUTER_API_KEY` in `.env` (copy `.env.example`). Every LLM call throws without it.
- Models come from `DEVIL_DRAFT_MODEL` / `DEVIL_NEGOTIATE_MODEL` / `DEVIL_CONCLUDE_MODEL` (default `deepseek/deepseek-v4.1-flash`).
- **deepseek-v4.1-flash is a reasoning model.** It needs large completion budgets or it truncates and returns empty content. `instrumentGeneration.ts` retries with escalating budgets for this reason — don't lower them.
- Config env names: `config.ts` reads `DEVIL_DATA_DIRECTORY` then falls back to `DEVIL_DATA_DIR` (the name in `.env.example`). `DEVIL_STATS_PATH` (default `./data/generation-stats.json`) is undocumented there.

## Architecture

- All logic lives in `server/utils/devil/`; routes in `server/api/devil/` just wire it:
  - `instrumentSchema` — zod shape of the Instrument (recitals, definitions, provisions, schedules) plus server-only control fields.
  - `instrumentTemplates` — one canonical skeleton; twist chain is 2–3 provisions, substitution clause ~half the time.
  - `instrumentGeneration` — LLM fills the skeleton, strict assembly, retries, telemetry, server-authored Schedule of Charges.
  - `instrumentSimulation` — pure: provision states, substitution, neutralization, unresolved list.
  - `meters` — assessment/ceiling/outcome. `instrumentRecord` — post-game record + plain terms. `sessionStore` — JSON filings.
- Flow: `issue.post.ts` returns immediately and generates in the background; the client polls `issue/status.get.ts`, then `negotiate.post.ts`, then `conclude.post.ts`.
- Player-visible types/session state are mirrored in `app/composables/useDevilSession.ts`.

## Invariants — breaking these is a bug

- **Control fields never reach the client.** `playerView.toPlayerInstrument` strips `controllingProvisionIdentifiers`, `neutralizationMethodByIdentifier`, `severabilityProvisionIdentifiers`, `substitutionCoverageByIdentifier`, `substitutionWordingByIdentifier`, `laymanExplanation`, `trapSummary`. Extend its leak test when you add fields.
- **Never serve the skeleton fallback.** Hint text must never be player-facing. `assembleInstrumentStrict` returns `null` on any missing field; `generateInstrument` retries, then throws so the ticket fails. `containsPlaceholderText` and `validateGeneratedContent` are the guards.
- **The mechanism lives in the articles, not the recitals.** `validateGeneratedContent` rejects recitals containing `§` or mechanism language, and rejects a §6.1 that doesn't name the §1.4 term.
- **Player-facing copy never admits the trap.** No "trap/twist/keystone" before disposition; the reveal is `LaymanSummary` + `ContractOfRecord` only.
- **Economy constants are load-bearing:** strike 4, amend 3, ceiling 20 in `meters.ts`. A per-structure winnability test asserts the optimal line fits under the ceiling — if you retune numbers, that test should fail until the game is winnable again.
- **Schedule A is authored server-side** from those constants. Never let the model write it.
- Approval is free and sign requires every provision to be dispositioned (enforced in `conclude.post.ts`).

## Conventions

- Full-word, unabbreviated identifiers everywhere (`processingFee`, not `pFee`).
- Function parameters are commonly named `parameters`; Vue props are named `properties` (not `props`/`params`). Match the surrounding code.
- Utilities live in `.ts` files with explicit parameter and return types; `any` is not used.
- The city-issued look is one file: `app/assets/css/gov.css`.

## Testing

- Vitest only, `test/**/*.test.ts`, node env. `vitest.config.ts` sets `DEVIL_DATA_DIRECTORY`/`DEVIL_STATS_PATH` under `./.data/` — tests must never write to `data/`.
- Pure modules (templates, simulation, meters, record, generation guards) are unit-tested. Endpoints and UI are verified by running the dev server; a live instrument takes ~20–40s to generate.

## Nuxt gotchas

- `~`/`@` map to `app/`.
- Server sub-routes need a matching directory: `issue.post.ts` and `issue/status.get.ts` coexist.
- Do **not** add `pages/filings.vue` alongside `pages/filings/[id].vue`; use `pages/filings/index.vue` or the child route silently won't render.
- Client code must not import `server/utils/devil/config` (it reads `process.env`).

## Git

- Remote `git@github.com:bapaynter/window-13.git`, branch `main`.
- `data/`, `.data/`, `.env`, `.nuxt`, `node_modules` are gitignored — never commit runtime filings or secrets.
