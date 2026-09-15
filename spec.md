# Spec: Window 13 — Deal with the Devil

A browser game where you negotiate a soul contract with a bored infernal clerk.

## The instrument (what to build)

- **One wish.** The player submits a single wish through a form.
- **The clerk issues an instrument** — a single dense legal document: recitals, definitions, numbered provisions, and any attached schedules. Roughly 18 provisions.
- **Everything is visible.** There is no hidden clause. The difficulty is comprehending dense legalese and tracing how provisions modify each other, not information asymmetry.
- **Controlling provisions.** One to three linked provisions determine how the wish is performed. They are not identified to the player; they are discoverable by reading and following cross-references (§).

## Actions

| Action | Effect |
|---|---|
| **Approve** | Adds the provision's processing fee to the burden. |
| **Strike** | Removes the provision. Escalating surcharge. If an active severability provision covers it, the Department substitutes an equivalent term and the strike does not take effect. |
| **Amend** | Replaces the wording. Clause fee rises; escalating surcharge. Some provisions cannot usefully be struck because striking triggers a substitution — those must be amended. Wording that tries to erase a cost is folded back in and the fee doubles. |

Schedules cannot be struck; the provision that incorporates a schedule must be struck instead.

## Burden and outcomes

`burden = processingFee + administrativeSurcharge`, capped at 100. The trap threshold is **60**, applied to the burden.

| Outcome | Condition |
|---|---|
| Clean Escape | All controlling provisions neutralized, burden < 60 |
| Trapped | All neutralized, burden ≥ 60 |
| Partial | Some but not all neutralized |
| Literal Hell | None neutralized |
| Draw | Walked away |

## The clerk

- Tone: dry, bored, bureaucratic — a DMV clerk who processes damnation.
- **Three personalities**, one chosen at random per session, never disclosed. They differ only in voice, vocabulary, and clause phrasing; numbers and outcomes are identical.
- The clerk never identifies the controlling provisions.

## Presentation

- A dated government website, slightly hell-themed: aged paper, burgundy header, muted red and gold, serif type, small blue links, a department seal.
- Real fake pages: Home, Wish Intake, Instrument, Notice, Filings, Regulations, FAQ, Contact.
- Cross-references render as clickable chips that scroll to and highlight their target; each provision shows its backlinks.
- Light bureaucratic friction as comedy. Never blocks play.

## Post-game

After signing or withdrawing, the office supplies **Attachment A — Contract of Record**: every provision with its disposition, the controlling provisions marked and whether each was neutralized, any amendment wording, dangling references, the full record of proceedings, and the burden against threshold. Past filings are reopenable from `/filings`.

## Boundaries (do not build)

- No accounts, no auth, no multiplayer, no credits or hints to buy.
- No real-world harm: wishes targeting real people or real violence are refused in character.
- No persistence beyond a local JSON filing per completed session.
