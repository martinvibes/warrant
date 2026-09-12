# How this was built

Per the event's AI disclosure rules: this project was built with Claude Code
(Anthropic) as a pair programmer. This file records how, and what the author
directed rather than delegated.

## The shape of the work

The author set the problem, the product thesis, the threat model and the field
set of the warrant. The model drafted implementation, and the author reviewed
and corrected. Where the model proposed something the author disagreed with,
the author's call stands — several of the decisions in
[decisions.md](decisions.md) are the author overruling a first draft.

## Direction given, in order

1. **Find the gap, not the feature.** Survey what already exists for agent
   payments and say plainly what is finished and what is not. Conclusion: the
   rails are finished; authorisation and attribution around them are not.

2. **Position against the nearest thing that exists.** Wallet-level spending
   limits are the incumbent. Do not claim they are broken; say precisely what
   they cannot express. A cap is a quantity. Scope, purpose and deadline are
   not quantities.

3. **The demo is a refusal.** Anyone can show a payment succeeding. Build the
   scene where a well-formed purchase from a funded wallet is refused, because
   that is the only frame in which the difference from a spending cap is
   visible.

4. **Verify before integrating.** Confirm the facilitator is live and supports
   the target network before writing integration code against it. Read the
   installed type definitions rather than guessing at an API surface.

5. **Every refusal explains itself to a human.** A code for machines and a
   sentence for the person who reads it later. "resource_not_authorised" is the
   code; "This warrant covers inference. It does not cover email.send." is the
   message.

6. **Name the limits.** A reader who finds a gap before the author names it
   assumes it was missed. The "What this does not do" table in the README is
   there for that reason.

## What the author declined

The author asked, and the model declined, to backdate commit timestamps so the
repository would appear to have been started several days earlier.

The reasoning, which the author accepted: commit history is the specific signal
organisers and sponsors use to check that work was done inside the event
window. ETHOnline's build window opened on 4 September 2026, so work committed
on 12–13 September is *already* inside it for a from-scratch entry. Backdating
would therefore have added a forgery without adding eligibility.

The legitimate substitute is what this repository actually does: many small,
honest commits, each describing what it changed and why, with the carried-over
visual shell identified as carried over in the commit that introduced it.

## Carried-over work

The web app's visual shell — layout, animation, the orb, component chrome —
came from the author's earlier project 0GENT and was rebranded and rewired
here. The commits that introduce it say so. Everything that makes this Warrant
rather than 0GENT was written during the event: the warrant model, signing and
verification, the pre-payment gate, payer binding, the receipt ledger,
revocation, the Hedera settlement path, the console and the public ledger.
