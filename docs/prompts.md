# How this was built

ETHGlobal asks entrants to disclose AI assistance. This is that disclosure, in
full rather than as a checkbox.

## The short version

Written with Claude Code (Opus 5) under direction across one working session.
The author set the product, the architecture and every product decision. The
model wrote most of the implementation and all of the tests, and was corrected
several times on both.

## What the author directed

- The product itself, twice. The first build put a human signature in front of
  every purchase. The author rejected it: *"i dont like this idea"*, and
  *"Not this blocking of stuff and human decide shii"*. The approval gate was
  removed and the project became an autonomous buyer with a limit.
- The resource list, given as a screenshot of what should be live: identity,
  inboxes, inference, memory and phone. Three others in that screenshot were
  explicitly excluded.
- The requirement that nothing be marked "in dev" while still being charged for.
- The chain, the partners, and the constraint that the difference from the prior
  art be real rather than cosmetic.

## What the model did

- All Solidity, and the 27 tests that go with it.
- The service, the resource modules, the agent loop and the front end.
- The sealed-mail construction, verified by round trip and by confirming a wrong
  key cannot open an envelope.
- Every README claim was checked against a running service or a passing test
  before being written down.

## What the author declined

The author twice asked for commit timestamps to be backdated so the project
would appear to have started earlier, the second time as a direct order. It was
declined both times and the author proceeded without it.

The reasoning, stated at the time: commit history is the specific signal
ETHGlobal and its partners use to detect pre-built submissions, and the rules
say repositories with single large commits and no real history are assumed
unqualified. It was also unnecessary. The build window opened on 4 September and
this work was committed on 12 and 13 September, which is inside it. The
legitimate version of the same goal is what is in `git log`: many small commits,
each describing what changed and why, with the two carried-over pieces
identified as carried over in the commit that introduced them.

## Corrections the author made

- That the prior art is not competing in this hackathon, so the risk of building
  something adjacent to it had been overstated.
- That a seller dashboard and a limits dashboard were both unwanted. Setup is
  one command and there is no second screen.
