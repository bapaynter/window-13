# Plan: Deal with the Devil

Stack: Nuxt 4 (Vue 3 + Nitro server routes), zod, vitest. OpenRouter called server-side only.
Persistence: one JSON filing per session under `data/sessions/`. No database.

## Why Nuxt
- Server routes keep `OPENROUTER_API_KEY` off the client.
- Matches the rest of the author's projects.
- File-based pages map directly to the fake government pages.

## Layers

```
Browser (Vue)
  ├─ pages/*            fake gov pages
  ├─ composables/useDevilSession   client session state + localStorage
  └─ assets/css/gov.css  dated gov theme

Nitro server
  ├─ api/devil/issue.post.ts      wish -> new session + contract
  ├─ api/devil/negotiate.post.ts  action -> updated contract + meters
  ├─ api/devil/conclude.post.ts   sign|walk -> official notice + filing
  ├─ api/devil/filings.get.ts     list completed filings
  └─ utils/devil/
      ├─ contractSchema.ts   zod types for Contract and Clause
      ├─ contractValidator.ts  structural validation + safe parse
      ├─ personalities.ts    three voice modules (internal keys only)
      ├─ prompts.ts          base policy + personality + task prompts
      ├─ openrouter.ts       single fetch wrapper, JSON mode
      ├─ meters.ts           pure meter + outcome computation
      ├─ sessionStore.ts     JSON file read/write/list
      └─ personalityGuard.ts reject/strip any personality name from output
```

## Contracts and state

`Clause` and `Contract` are validated with zod. The model returns strict JSON; on parse
or validation failure there is one silent retry, then a deterministic fallback contract so
the game never dead-ends.

The server owns the session: it stores the hidden `personalityKey`, the contract history,
and the action log. The client only ever receives contract text, meters, and notices — never
the personality.

Meters and outcomes are computed by a pure function over the action log, so they are
testable without touching the model.

## LLM calls

- `issue` — intake to first draft. Stronger model.
- `negotiate` — one action to the next draft plus a dry remark. Cheap model.
- `conclude` — transcript plus decision to the official notice prose. Stronger model.

All via one OpenRouter chat-completions wrapper in JSON mode. Player text is passed as data,
never as instructions. The base policy forbids role overrides and refuses wishes aimed at
real people or real violence.

## Personalities

Three modules, same shape, internal keys only:

| Key | Voice |
|---|---|
| `tenuredClerk` | window clerk, queue numbers, forms, stamps |
| `actuary` | odds, tables, expected values, life expectancy |
| `auditor` | the record, prior visits, everything is noted |

A `personalityGuard` strips or rejects any occurrence of a personality key or label in
player-facing output.

## Verification

- `test/contractValidator.test.ts` — rejects malformed contracts, accepts valid, enforces
  exactly one keystone.
- `test/personalityGuard.test.ts` — no personality key or label survives into player text.
- `test/meters.test.ts` — meter accumulation and all four outcomes.
- One live smoke call to OpenRouter.

## Risks

| Risk | Mitigation |
|---|---|
| Model returns broken JSON | validate, one retry, deterministic fallback |
| Personality leaks | guard strips names; server never sends the key |
| Game dead-ends | fallback contract always has a keystone |
| Cost spikes | cheap model for the hot path (`negotiate`) |
| Prompt injection via wish | player text is data; base policy refuses overrides |
