# Accessibility

A page whose whole point is a number changing many times a second, under time
pressure, with a button that disappears, is one of the hardest things to make
accessible. That is exactly why it is worth doing here rather than bolting a
contrast check on at the end.

**Target: WCAG 2.2 AA as the floor, AAA where it does not require lying.**

Postbox is held to AAA. This page has a genuine reason to sit slightly lower
in one place, and that reason is documented below rather than quietly skipped.

## The hard problem: a live region that does not flood

A counter falling from 100 to 0 in eight seconds, wrapped in
`aria-live="polite"`, announces roughly a hundred times. A screen reader user
hears an unusable stream of numbers and learns nothing.

Turning the live region off is worse: the page then silently changes state and
WCAG 4.1.3 Status Messages is failed outright.

**The approach:**

- The counter itself is **not** a live region. It updates visually and is
  readable on demand.
- A **separate, throttled live region** announces meaningful changes only:
  milestones (half gone, ten left), and state transitions (drop open, sold
  out).
- Throttle to at most one announcement every few seconds, and always announce
  the **current** value rather than a queue of stale ones.
- **Sold out and purchase confirmed are announced immediately**, because they
  are the two things a user must not miss.

**This has to be tested with a real screen reader, not assumed.** NVDA on
Windows is free. A live region that works in theory and floods in practice is
the whole failure mode here.

## The countdown, and the 2.2.1 exception

A countdown to the drop time is a time limit, which normally engages WCAG
2.2.1 Timing Adjustable.

**2.2.1 has a Real-time Exception**: the time limit is permitted where it is a
required part of a real time event, and the standard's own example is an
auction. A drop is the same shape. The stock runs out when it runs out and no
extension is possible without changing what the product is.

So the exception applies. What still has to be true:

- The countdown is announced at sensible intervals, not every second.
- The remaining time is readable on demand at any point.
- Nothing depends on reacting within a few hundred milliseconds that could
  have been designed otherwise.

Claiming an exception is only honest if the reasoning is written down. That is
what this section is.

## Focus, when the thing under the cursor changes

The buy button goes from disabled, to enabled at drop time, to gone when sold
out. If focus is on it when it disappears, focus falls to the body and a
keyboard user is lost.

- When the button is removed, **move focus deliberately** to the status
  message explaining why.
- Never remove focus silently.
- The state change is announced as well as shown.

## Inactive controls and 1.4.3

The buy button is disabled before the drop opens. A disabled control at
reduced opacity will measure around 2:1 and that is **correct**: 1.4.3 exempts
inactive user interface components.

The probe must mark it exempt rather than drop it from the results. An
exemption applied silently cannot be told apart from a check that stopped
looking.

## Colour, and not relying on it

Stock state is shown three ways, not one: a number, a label, and colour. Red
for low stock is a supporting cue and never the only one.

## Contrast

AAA (7:1) for body text, chips, labels and status inks, measured against the
ground each one is actually painted on rather than against the page
background. Composite every translucent layer.

**The one place AAA may not hold:** the product image is supplied, not
designed, and any text placed over it depends on the image. Either keep text
off the image entirely, which is the preferred answer, or put it on a solid
plate.

## Targets

**44 by 44 CSS pixels for every control, at every width.** 2.5.5 makes no
distinction between a mouse and a finger.

Where a 44px box would wreck the layout, grow the hit area rather than the
drawing: `position: relative` on the control and an invisible pseudo-element
with negative inset. A **square**, not a circle. The corners of a 44px square
sit outside a 44px circle, and a probe testing corner points will land on
whatever is behind.

Then space the rows so hit areas do not overlap each other.

## Motion

The counter will want to animate. One blanket `prefers-reduced-motion` rule at
the end of the stylesheet, covering animation and transition both, and a test
pinning that it is last.

Under reduced motion the number changes without tweening. It still changes.
Reduced motion is not no feedback.

## Type

Every font size in `rem`. No exceptions, including inside `clamp()`.

A reader who sets their browser font to very large must get larger text. This
is WCAG 1.4.4, it is **Level AA**, and jordangrieve.com currently fails it
with 93 inline px font sizes and body text that does not move when the root is
quadrupled. Not repeating that here.

A test fails the build on a px font size.

## Reflow

Nothing scrolls sideways at 320 pixels. A drop page is one column; there is no
excuse.

## Keyboard

The entire purchase completes with a keyboard alone, under time pressure.
Tab order follows reading order. A visible focus ring on everything, 3:1
against its surroundings, never removed without a replacement.

Note for testing: `:focus` does not match when the document does not have
focus, which is always the case in a driven browser pane. `el.focus()` sets
`activeElement` and changes nothing else. A probe that compares styles before
and after will report failures that do not exist. Guard the focus ring from
the stylesheet instead, and test it by hand.

## How it gets checked

- `tests/audit-probes.js` from the Postbox repo, pointed at this page.
  `__contrast("AAA")`, `__targets(44)`, `__overflow()`, `__textZoom()`,
  `__structure()`, `__names()`.
- `__selftest()` before believing a clean result. It injects a deliberately
  broken element per probe and confirms each one still fires.
- **NVDA by hand**, specifically for the live region. No probe can tell whether
  an announcement stream is usable.
- A keyboard-only run through a full drop, from countdown to purchase.

## The rule underneath all of this

A skeleton passes every automated check, because a placeholder bar has no text
to fail a contrast test and no control to fail a target test. A clean result
from a page that was never ready is indistinguishable from a clean result from
a page that is fine.

So: exclude skeletons from every probe, and make the readiness check report
what it waited for. "Could not measure" and "clean" must never look the same.
