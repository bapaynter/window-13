# Window 13

*Deal with the Devil — a browser game where you negotiate a soul contract with a bored infernal clerk.* You get exactly one wish. The clerk issues a contract with concealed terms. You approve, strike, amend, or spend credits to force disclosure, then sign or walk away.

Built as a dated government website, slightly hell-themed. The Department of Soul Registry processes damnation in the order received.

## Run

```bash
npm install
cp .env.example .env   # then set OPENROUTER_API_KEY
npm run dev             # http://localhost:3000
```

## Play

1. **Wish Intake** (`/wish`) — state one wish.
2. **Contract** (`/contract`) — review each clause:
   - `[APPROVE]` adds the clause's processing fee.
   - `[STRIKE]` voids it. A struck clause that is not load-bearing is **reissued immediately** under revised (worse) terms. Only the load-bearing clause removes cleanly.
   - `[AMEND]` replaces the wording; the concealed term adapts. Wording that tries to erase a cost is folded back in and the clause fee doubles.
   - `[INVOKE]` spends a credit to disclose every concealed term.
3. **Sign or Withdraw.** Withdrawal is a neutral draw. No penalty, no reward.

Fees and surcharges combine into a **total burden**. The trap threshold (60) applies to the burden, so every strike and amendment counts. Repeat strikes and amendments are surcharged at an increasing rate (strike `5×k`, amendment `3×k`).

Outcomes: **Clean Escape** (load-bearing clause struck, burden under 60), **Trapped** (struck, burden 60+), **Literal Hell** (load-bearing clause stands), **Draw** (walked away).

## Contract of Record

After you sign or withdraw, the office hands you **Attachment A — Contract of Record**: every clause with its concealed term revealed, its disposition (approved / struck / replaced / amended / untouched), the original wording of anything you changed, the load-bearing clause marked, and your full record of proceedings. Past filings are reopenable from `/filings`.

## The Clerk

Three voices — a tenured window clerk, an actuary, an auditor — one randomly assigned per session. Mechanically identical. The active voice is never named to the player; it leaks only through vocabulary and clause phrasing.

## Stack

- Nuxt 4 (Vue 3 + Nitro server routes). OpenRouter is called server-side only.
- zod for contract validation; one silent retry then a deterministic fallback contract, so the game never dead-ends.
- Mechanics are pure, testable modules: `meters.ts` (burden + outcomes), `negotiation.ts` (the strike/amend reducer), `finalDocument.ts` (the post-game record). The load-bearing flag never leaves the server during play.
- Filings persisted as JSON under `data/sessions/`.

## Tests

```bash
npm test        # validator, personality guard, meters, negotiation reducer, final document
npm run typecheck
```
