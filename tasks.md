# Tasks: Deal with the Devil

Execute in order. TDD Lock applies to every non-trivial module:
Red (failing test) -> Green (minimum code) -> Refactor.

## Task 1 — Project scaffold

- [x] 1.1 package.json, nuxt.config.ts, tsconfig.json, .gitignore, .env
- [x] 1.2 `npm install`
- [x] 1.3 Verify: `npx vitest run` executes (no tests yet passes)

## Task 2 — Contract schema and validator

- [ ] 2.1 Red: `test/contractValidator.test.ts` — rejects malformed, accepts valid,
      enforces exactly one keystone, rejects out-of-range processing fee
- [ ] 2.2 Green: `server/utils/devil/contractSchema.ts`, `contractValidator.ts`
- [ ] 2.3 Verify: `npx vitest run test/contractValidator.test.ts`

## Task 3 — Personality guard

- [ ] 3.1 Red: `test/personalityGuard.test.ts` — strips keys and labels, flags leaks
- [ ] 3.2 Green: `server/utils/devil/personalityGuard.ts`
- [ ] 3.3 Verify: `npx vitest run test/personalityGuard.test.ts`

## Task 4 — Meters and outcomes

- [ ] 4.1 Red: `test/meters.test.ts` — fee and surcharge accumulation, credit spend,
      Clean Escape, Trapped, Literal Hell, Draw
- [ ] 4.2 Green: `server/utils/devil/meters.ts`
- [ ] 4.3 Verify: `npx vitest run test/meters.test.ts`

## Task 5 — Personalities and prompts

- [ ] 5.1 `server/utils/devil/personalities.ts` — three voice modules
- [ ] 5.2 `server/utils/devil/prompts.ts` — base policy + personality + issue/negotiate/conclude
- [ ] 5.3 Verify: `npx vitest run` still green

## Task 6 — OpenRouter wrapper and session store

- [ ] 6.1 `server/utils/devil/openrouter.ts` — JSON-mode chat, one retry, fallback
- [ ] 6.2 `server/utils/devil/sessionStore.ts` — create/load/save/list JSON filings
- [ ] 6.3 Verify: typecheck via `npx nuxt prepare` then `npx vitest run`

## Task 7 — Server endpoints

- [ ] 7.1 `issue.post.ts` — wish -> session + contract
- [ ] 7.2 `negotiate.post.ts` — action -> contract + meters
- [ ] 7.3 `conclude.post.ts` — sign|walk -> notice + filing
- [ ] 7.4 `filings.get.ts` — list filings
- [ ] 7.5 Verify: dev server, manual requests

## Task 8 — Government UI

- [ ] 8.1 `assets/css/gov.css` — dated gov theme, hell undertone
- [ ] 8.2 `app.vue` — shell: seal, nav, Now Serving ticker, cookie banner, footer
- [ ] 8.3 `pages/index.vue`, `wish.vue`, `contract.vue`, `notice.vue`
- [ ] 8.4 `pages/filings.vue`, `regulations.vue`, `faq.vue`, `contact.vue`
- [ ] 8.5 components: `ContractDocument.vue`, `StatementOfAccount.vue`, `AgentChat.vue`
- [ ] 8.6 `composables/useDevilSession.ts`
- [ ] 8.7 Verify: dev server, full playthrough

## Task 9 — Close-out

- [ ] 9.1 Full test run + lint
- [ ] 9.2 Live smoke call against OpenRouter
- [ ] 9.3 Report done; await review before any commit
