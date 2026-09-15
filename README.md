# Window 13

*Deal with the Devil — a browser game where you negotiate a soul contract with a bored infernal clerk.* You get exactly one wish. The clerk issues a dense instrument of fine print with concealed cross-references. Read it carefully, work out which provisions control your wish, and neutralize them — by striking or, where striking would be substituted, by amending — then sign or walk away.

## Run

Requires Node 20+ and an OpenRouter API key.

```bash
npm install
cp .env.example .env   # then set OPENROUTER_API_KEY
npm run dev             # http://localhost:3000
```

## Play

1. **Wish Intake** (`/wish`) — state one wish.
2. **Instrument** (`/contract`) — read the document. Definitions, provisions, and schedules are all visible. `§` references are clickable and provisions list their backlinks.
   - `[APPROVE]` adds the provision's processing fee.
   - `[STRIKE]` removes a provision. If a severability provision covers it, an equivalent term is substituted and the strike does not take effect.
   - `[AMEND]` rewrites a provision. Some provisions can only be neutralized by amendment.
3. **Sign or Withdraw.** Withdrawal is a neutral draw.

Fees and surcharges combine into a **total burden**. The trap threshold (60) applies to the burden; repeat strikes and amendments are surcharged at an increasing rate.

Outcomes: **Clean Escape** (all controlling provisions neutralized, burden under 60), **Trapped** (neutralized, burden 60+), **Partial** (some neutralized), **Literal Hell** (none), **Draw** (walked away).

## Contract of Record

After you sign or withdraw, the office supplies **Attachment A**: every provision with its disposition, which provisions were controlling and whether each was neutralized, any amendment wording you filed, dangling references, your full record of proceedings, and burden against threshold. Past filings are reopenable from `/filings`.

## The clerk

Three voices — a tenured window clerk, an actuary, an auditor — one randomly assigned per session. Mechanically identical. The active voice is never named to the player and never identifies the controlling provisions.

## Stack

- Nuxt 4 (Vue 3 + Nitro server routes). OpenRouter is called server-side only.
- **Templates + LLM wording:** code templates define the provision graph and a solvable controlling chain; the model only writes the legalese, which is validated against the schema and clamped to length limits, with a deterministic fallback so the game never dead-ends.
- The puzzle is pure and testable: `instrumentSimulation.ts` (severability, substitution, amend-only, cascade), `instrumentTemplates.ts` (five archetypes, each verified solvable), `meters.ts` (burden), `instrumentRecord.ts` (post-game record).
- Control flags never leave the server during play.
- Filings persisted as JSON under `data/sessions/`.

## Instrument archetypes

Five trap structures, chosen at random per session:

- **Precedence and survival** — a "notwithstanding" clause plus a survival clause keep the trap alive.
- **Hostile defined term** — a definition is broadened, and definitions are made to control; amend the definition, strike the priority clause.
- **Incorporated schedule** — the harmful material sits in a schedule; strike the incorporating clauses, not the schedule.
- **Ambiguity** — every conflict and ambiguity is routed in the Department's favour.
- **Severability guard** — a self-protecting severability clause substitutes anything you strike; amend it first, then strike.

## Tests

```bash
npm test        # schema, templates/solvability, simulation, meters, personality guard
npm run typecheck
```
