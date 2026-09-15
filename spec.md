# Spec: Window 13 — Deal with the Devil

A browser game where you review a soul contract issued by a bored infernal clerk, and either catch the catch or sign anyway.

## The instrument

- **One wish.** The player submits a single wish through a form.
- **The clerk issues an Instrument** — one dense legal document: recitals, definitions, numbered provisions, and any attached schedules. Roughly ten to thirteen provisions.
- **Everything is visible.** Nothing is hidden. The difficulty is comprehending dense legalese and tracing how provisions modify each other, not information asymmetry.
- The **recitals are an intake record only** (date, wish, registration, grant). The performance mechanism lives in the operative provisions — §6.1 states concretely how the wish is performed — because those are the provisions the applicant may strike or amend. The Schedule of Charges is generated from the game's own constants, so it cannot contradict the economy.

## The twist

**The Department grants every wish in full, unconditionally, and in perpetuity.** The trap is never that the wish is withheld — it is a literal reading. A word from the wish is defined, applied, and given priority so that the granted wish resolves badly. The Instrument never admits this; the effect is inferable only by reading the cross-references (§1.5 → §6.1 → §6.2 → §6.3).

Structure varies per session: the operative chain is two or three provisions, and roughly half the Instruments include a substitution clause that reissues anything struck.

## Actions

| Action | Effect |
|---|---|
| **Approve** | Accepts the provision. Approval is free. |
| **Strike** | Removes the provision at a fixed surcharge. If an active substitution provision covers it, the Department reissues an equivalent provision and the strike does not take effect. |
| **Amend** | Replaces the wording at a fixed surcharge; amending a substitution provision disables it. |

Schedules form part of the Instrument and are not separately variable. Every provision must be dispositioned before the Instrument can be signed.

## Assessment and outcomes

The assessment is the sum of administrative surcharges only (strike 4, amend 3). The assessment ceiling is **20**.

| Outcome | Condition |
|---|---|
| Clean Escape | Operative terms neutralized, assessment < 20 |
| Trapped | Neutralized, assessment ≥ 20 |
| Partial | Some operative terms neutralized |
| Literal Hell | None neutralized |
| Draw | Walked away |

## The clerk

- Tone: dry, bored, bureaucratic — a DMV clerk who processes damnation.
- **Three personalities**, one chosen at random per session, never disclosed. They differ only in voice, vocabulary, and clause phrasing; numbers and outcomes are identical.
- The clerk never identifies the operative terms, and no player-facing copy admits that the wish is being twisted.

## Presentation

- A dated government website, slightly hell-themed: aged paper, burgundy header, muted red and gold, serif type, small blue links, a department seal.
- Real fake pages: Home, Wish Intake, Instrument, Notice, Filings, Regulations, FAQ, Contact.
- Cross-references render as clickable chips that scroll to and highlight their target; each provision shows its backlinks. The Instrument renders as a legal document; the word "trap" never appears before disposition.
- A queue screen covers instrument generation. It polls for the result, so it survives a refresh. Drafting retries with an escalating budget; if every attempt fails the ticket fails and the applicant refiles — placeholder text is never served.
- Light bureaucratic friction as comedy. Never blocks play.

## Post-game

After signing or withdrawing:

- **In Plain Terms** — the twist, whether and how it was set aside, and what the wish actually becomes, written per wish.
- **Attachment A — Contract of Record** — every provision with its disposition, the operative terms marked and whether each was neutralized, any amendment wording, dangling references, the full record of proceedings, and the assessment against the ceiling.

Past filings are reopenable from `/filings`.

## Boundaries (do not build)

- No accounts, no auth, no multiplayer, no hints to buy.
- No real-world harm: wishes targeting real people or real violence are refused in character.
- No persistence beyond a local JSON filing per completed session.
