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
| [docs/DEPLOY.md](docs/DEPLOY.md) | The whole thing on one small VPS, in an hour |

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

Started 21 October 2026. Weeks 1 to 4 done the same day, with week 4 run
locally in Docker rather than on AWS so far: the atomic purchase with its
concurrency test and the deliberate oversell, the page and the live
counter, the OpenTelemetry agent into Grafana, k6 as the acceptance test,
and two instances behind nginx with Redis fan-out.

**The headline has been earned.** 10,000 simultaneous buyers, two
instances, exactly 100 sold, three runs in a row. See
[docs/results/NOTES.md](docs/results/NOTES.md). Still to do: the same shape
on a public VPS ([docs/DEPLOY.md](docs/DEPLOY.md)), the other two
concurrency strategies, the instance-kill and network-drop experiments, and
the writeup.
