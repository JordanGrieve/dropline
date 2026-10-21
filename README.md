# Dropline

A limited stock product drop that cannot oversell, and proves it under load.

One landing page, one product, a fixed number of units. At the drop time
everybody on the page can buy, and a live counter shows stock falling in real
time for every viewer at once.

**Ten thousand simulated buyers, one hundred units, exactly one hundred sold.**
That sentence is the deliverable. Everything here exists to make it true and to
prove it.

## Why this one

The core feature is the hard problem. Overselling is the canonical race
condition, so there is no way to drift into building features instead of
solving it. It is real time by nature, so the WebSocket work is the product
rather than decoration. And load testing is the acceptance test, not an
afterthought.

It also sits in a domain I already know. I hold the DFYNE storefront through
its biggest drops and sale days, so this is the backend half of a story my
CV already tells.

## The documents

| File | What it covers |
| --- | --- |
| [SCOPE.md](SCOPE.md) | What is in, what is out, and the build order |
| [SUCCESS.md](SUCCESS.md) | What finished looks like, and the numbers that decide it |
| [TECH-STACK.md](TECH-STACK.md) | Every choice and why it was made |
| [ACCESSIBILITY.md](ACCESSIBILITY.md) | A live updating page is hard to make accessible. This is how |

## The line it all turns on

```sql
UPDATE stock
   SET remaining = remaining - 1
 WHERE id = ? AND remaining > 0
RETURNING remaining;
```

The database decides, not the application. No read, then think, then write.
Zero rows affected means sold out.

## Status

Started 21 October 2026. Weeks 1 to 3 done the same day: the atomic
purchase with its concurrency test and the deliberate oversell, the page
and the live counter, the OpenTelemetry agent into Grafana, and the first
k6 runs. The headline run has passed once on one instance; see
[docs/results/NOTES.md](docs/results/NOTES.md). Week 4, more than one
instance on AWS, is next.
