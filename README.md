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

1. **Wish Intake** (`/wish`) — state one wish. You are placed in a queue while the instrument is drawn up; the waiting screen (`/waiting`) shows your ticket number and survives a refresh, since generation runs in the background and the page polls for the result. After ~90 seconds you can abandon the ticket and return to intake. If drafting fails after several attempts the ticket is failed and you can refile — the game never falls back to placeholder text.
2. **Instrument** (`/contract`) — read the document. Definitions, provisions, and schedules are all visible. `§` references are clickable and provisions list their backlinks. Every provision must be dispositioned before you can sign.
   - `[APPROVE]` accepts a provision. Approval is free.
   - `[STRIKE]` removes a provision, at a fixed surcharge. If an active substitution provision covers it, an equivalent provision is reissued and the strike does not take effect.
   - `[AMEND]` rewrites a provision, at a fixed surcharge. Amending a substitution provision disables it.
3. **Sign or Withdraw.** Withdrawal is a neutral draw.

Approval is free; each strike (4) or amendment (3) is assessed. The **assessment ceiling is 20**. A correct line costs 8–15 depending on structure, so one mis-edit still fits and two will trap you.

Outcomes: **Clean Escape** (the operative terms are neutralized, assessment under 20), **Trapped** (neutralized, assessment 20+), **Partial** (some neutralized), **Literal Hell** (none), **Draw** (walked away).

## Contract of Record

After you sign or withdraw the office supplies **In Plain Terms** — what the document did to your wish, what you did about it, and what the wish actually becomes — followed by **Attachment A**: every provision with its disposition, which terms were operative and whether each was neutralized, any amendment wording you filed, dangling references, and your full record of proceedings. Past filings are reopenable from `/filings`.

## The clerk

Three voices — a tenured window clerk, an actuary, an auditor — one randomly assigned per session. Mechanically identical. The active voice is never named to the player and never identifies the operative terms.

## Stack

- Nuxt 4 (Vue 3 + Nitro server routes). OpenRouter is called server-side only.
- **Templates + LLM wording:** the skeleton fixes the provision graph and a solvable operative chain; the model only writes the legalese, which is validated against the schema and clamped to length limits, with a deterministic fallback so the game never dead-ends.
- The puzzle is pure and testable: `instrumentSimulation.ts` (severability, substitution, cascade), `instrumentTemplates.ts` (the canonical skeleton, each structure verified solvable), `meters.ts` (assessment), `instrumentRecord.ts` (post-game record + plain terms).
- Control flags and the plain-language explanation never leave the server during play.
- Instrument drafting retries with an escalating completion budget (deepseek-v4.1-flash is a reasoning model, so truncated replies are retried). If every attempt fails, the ticket fails and the player refiles; the generator never substitutes placeholder text. Attempt/success/failure counts are written to `data/generation-stats.json` and exposed at `GET /api/devil/generation-stats` so reliability can be tracked.
- Intake is asynchronous: `POST /api/devil/issue` saves a `generating` session and returns immediately; generation continues in the background and the waiting screen polls `GET /api/devil/issue/status`. A generation still pending after two minutes is treated as failed. The wait screen never depends on the in-flight request, so a reload resumes polling.
- Filings persisted as JSON under `data/sessions/`.

## The twist

The Department **grants every wish in full and without condition**. The trap is a literal reading: a word from your wish is defined, applied, and given priority so that the granted wish resolves badly. The Instrument never admits this — the only way to catch it is to read the cross-references.

Structure varies per session:

- The operative chain is **two or three** provisions (`canonical-2-*` / `canonical-3-*`).
- About half the instruments include a **substitution clause** that reissues anything you strike, so those terms must be amended rather than struck (`canonical-*-guarded`).

Neutralizing the operative chain leaves the grant as you intended it.
## Tests

```bash
npm test        # schema, templates/solvability, simulation, meters, personality guard
npm run typecheck
```
