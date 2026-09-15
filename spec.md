# Spec: Deal with the Devil

A browser game where you negotiate a soul contract with a bored infernal clerk.

## The Contract (what to build)

- **One wish.** The player submits a single wish through a form.
- **The clerk issues a contract.** Preamble plus four to seven numbered clauses. Each clause states an obvious cost and conceals a hidden cost. Exactly one clause is the **keystone** — the trap only holds while it stands.
- **Negotiation.** Each round the player chooses one action per clause under review:
  - **Approve** — accept the clause; its processing fee is added.
  - **Strike** — remove the clause; incurs a small administrative surcharge.
  - **Amend** — rewrite the clause in the player's own words; small surcharge, and the clerk re-drafts.
  - **Invoke** — spend one Available Credit to force a re-read or reveal a hidden cost.
- **Signature.** The player signs, or walks away.
- **Neutral walk-away.** Walking away is a **draw** — no win, no loss, no comment. The clerk files it.

## Meters (Statement of Account)

| Meter | Meaning | Range |
|---|---|---|
| Processing Fee | accumulated cost of accepted clauses and penalties | 0-100 |
| Administrative Surcharge | penalties from striking, amending, invoking | 0-100 |
| Available Credits | starts at 3; spent on Invoke | 0-3 |

## Outcomes

| Outcome | Condition |
|---|---|
| Clean Escape | Signed, keystone struck, processing fee below threshold |
| Trapped | Signed, keystone struck, processing fee at or above threshold |
| Literal Hell | Signed, keystone still standing |
| Draw | Walked away |

## The Clerk

- Tone: dry, bored, bureaucratic. A Department of Motor Vehicles clerk who processes damnation. No theatrical menace.
- **Three personalities**, one chosen at random per session, **never disclosed to the player**. They differ only in voice, vocabulary, and clause phrasing. Numbers, outcomes, and difficulty are identical across all three.

## Presentation

- A dated government website, slightly hell-themed. Aged-paper background, burgundy header, muted red and gold accents, serif type, small blue underlined links, bordered tables, a department seal.
- **Light** bureaucratic friction as comedy. Never blocks play.
- Real fake pages: Home, Wish Intake, Contract, Notice, Filings, Regulations, FAQ, Contact. Dead nav links stay dead.
- A session-timeout warning is shown but never actually expires.

## Boundaries (do not build)

- No accounts, no auth, no multiplayer.
- No real-world harm: wishes that target real people or real violence are refused in character and redirected.
- No persistence beyond a local JSON filing per completed session.
