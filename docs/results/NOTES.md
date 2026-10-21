# Load run notes

One entry per run. The JSON summaries beside this file are the evidence;
this file is what they mean. Every number carries the conditions it was
measured under.

## 2026-10-21, run 1: headline, 2,000 buyers, 100 units

**Conditions.** One app instance, local, with the OpenTelemetry agent
attached. Postgres 16 in Docker on the same machine. k6 2.2.0 on the same
machine, 2,000 VUs, one purchase each, all fired within 0.4 s. Tomcat at
defaults: 200 threads, accept backlog 100. Hikari pool 10.

**Correctness.** 100 sold, 0 remaining. Pass.

**What broke first.** 1,595 of 2,000 connections were refused by the OS
before reaching Tomcat (`connectex: No connection could be made because the
target machine actively refused it`). Tomcat's accept backlog is 100 by
default. On Windows a full backlog refuses new connections outright; Linux
would drop the SYN and the client would retry. So the first limit hit was
the listen queue, at roughly 400 simultaneous connections, not threads and
not the database.

**Latency, for the 405 requests that got through.**

| | ms |
| --- | --- |
| p50 | 204 |
| p95 | 319 |
| p99 | 352 |
| max | 386 |

**Change made.** `server.tomcat.accept-count` and `max-connections` are now
configurable, with the backlog default raised from 100 to 2,048. Run 2
measures the same load with the backlog out of the way.

Summary: `2026-10-21-headline-2000.json`.

## 2026-10-21, run 2: the same, backlog raised to 2,048

**Correctness.** 100 sold, 0 remaining. Pass.

**Result.** 1,403 of 2,000 still refused. Raising Tomcat's backlog changed
almost nothing, so the limit is below Tomcat. A probe (a Java server socket
that never accepts, 2,000 connects fired at it) measured the cap directly:

| Backlog requested | Connections queued before refusal |
| --- | --- |
| 100 | 100 |
| 2,048 | 202 |

**Finding.** Windows 11 Home caps the TCP listen backlog at about 200
regardless of what the application asks for. A stampede of more than ~200
simultaneous connects is refused by the OS before the app is involved. This
is a property of the test machine, not of the system under test. Linux
honours `somaxconn`, so the AWS run in week 4 is where the true simultaneous
number comes from.

**Change made.** `headline.js` takes `JITTER` (seconds) to spread the
buyers' clicks over a short window. Runs 3 and 4 use it; the Linux runs
should not.

Summary: `2026-10-21-headline-2000-run2.json`.

## 2026-10-21, run 3: headline, 2,000 buyers over 2 s

Same conditions as run 2, `JITTER=2`.

**Correctness.** 100 sold, 1,900 told sold out, 0 unexpected. Pass.

| | ms |
| --- | --- |
| p50 | 2 |
| p95 | 64 |
| p99 | 129 |
| max | 210 |
| p50 of the 100 that bought (201s) | 57 |

With the arrival rate under the OS cap, nothing broke and the tail is
tight. The 201s are slower than the 409s because they also write the audit
row and broadcast; the 409s return from the single UPDATE.

Summary: `2026-10-21-headline-2000-jitter2.json`.

## 2026-10-21, run 4: the headline, 10,000 buyers over 5 s

Same conditions, `JITTER=5`, so roughly 2,000 connects per second.

**Correctness.** 100 sold, 0 remaining, 100 purchase rows. **Pass.** This is
the sentence the project exists to earn, on one instance, on a laptop.

**What broke.** 1,610 of 10,000 were refused by the OS backlog cap (run 2)
at 2,000 connects per second, and 200 connects sat in Windows SYN retry
before giving up: max latency 57 s. Every refused buyer was a buyer who
would have been told sold out anyway; none of them affected the count.

| | ms |
| --- | --- |
| p50 | 2 |
| p90 | 9 |
| p95 | 82 |
| max | 57,146 (the 200 SYN-retry stragglers) |

p99 was not captured in the export for this run; later runs pass
`--summary-trend-stats` so it is. The run that matters for the tail is the
Linux one in week 4, where the backlog cap does not apply.

Summary: `2026-10-21-headline-10000-jitter5.json`.

## 2026-10-21, run 5: fan-out, 2,000 live viewers

**Conditions.** As above. k6 ramped WebSocket connections 0 → 500 → 1,000 →
2,000 over 90 s, held 60 s, ramped down over 15 s. Five purchases made by
hand with curl, 8 s apart, during what was meant to be the hold.

**Result.** 2,000 connected, 2,000 snapshots received, 0 errors. Connect
time p99 1.5 ms. 4,305 broadcast messages received in total.

**Caveat.** 4,305 does not factor into fives of 2,000, so some of the five
purchases landed during the ramp-down when fewer viewers were connected.
The hand timing is the problem, not the server: no viewer that was
connected reported a missing message, and there is no error. Run 6 moves
the purchases inside the script so the expected count is exact.

Summary: `2026-10-21-fanout-2000.json`.

## 2026-10-21, run 6: fan-out, 2,000 live viewers, scripted purchases

Same ramp and hold. Five purchases made by the script itself, 10 s into the
hold, spaced 8 s apart, all while 2,000 viewers were connected.

**Result.** 2,000 connected, 2,000 snapshots, **10,000 broadcast messages,
exactly 5 × 2,000**, 0 errors. Connect time p99 1.5 ms, max 9 ms.

Every connected viewer received every broadcast. 2,000 is not the breaking
point; it is the first step. The next runs raise MAX until something gives,
and on Linux, since the Windows backlog cap (run 2) will interfere with the
connection ramp before the server does.

Summary: `2026-10-21-fanout-2000-run6.json`.

## 2026-10-21, run 7: the headline on Linux, two instances, no jitter

**Conditions.** `infra/docker-compose.cluster.yml`: two app instances
behind nginx, Redis fan-out, Postgres 16, otel-lgtm, all in Docker Desktop
(WSL2) on the same laptop. k6 2.3.0 in a container on the same network, so
the path is Linux to Linux and the Windows backlog cap (run 2) is gone.
10,000 VUs, one purchase each, **jitter 0**: every connect in the same
instant. nginx listen backlog 4,096, Tomcat accept-count 2,048 per
instance, 200 threads per instance, Hikari 10 per instance.

**Correctness.** 100 sold, 9,900 told sold out, 0 unexpected, 0 remaining,
100 purchase rows. **Pass.** All 10,000 answered in 2.7 s.

| | ms |
| --- | --- |
| p50 | 1,120 |
| p90 | 1,700 |
| p95 | 1,760 |
| p99 | 1,830 |
| max | 1,960 |

**Reading it.** Nothing was refused and nothing errored: the queueing
moved from the OS, where it was fatal, to nginx and Tomcat, where it is
just latency. A median of 1.1 s is 10,000 requests draining through 400
Tomcat threads and 20 database connections; the tail is a tight 0.7 s
above the median, which says the queue is orderly. The first limit to lift
for the tail is the Hikari pool, and that is experiment 5's territory.

**Evidence.** The summary export for this run was lost: Git Bash rewrote
the container path and k6 could not save it, and the error was hidden by
an output filter. The numbers above are from the terminal. Runs 9 to 11
repeat it with the files saved; treat those as the evidence and this as the
cold-start data point.

## 2026-10-21, run 8: fan-out on Linux, 5,000 live viewers, two instances

Same cluster. Ramp 0 → 1,250 → 2,500 → 5,000 over 90 s, hold 60 s, five
scripted purchases during the hold, through nginx, so they land on both
instances and reach every viewer through Redis.

**Result.** 5,000 connected, 5,000 snapshots, **25,000 of 25,000 broadcast
messages**, 0 errors. Connect time p99 1.6 ms, max 34 ms.

Every viewer on either instance saw every purchase made on either instance,
in order. 5,000 is not the breaking point either; the next step is 10,000
and 20,000, which will want k6 on a separate machine before the numbers
mean anything.

Summary: `2026-10-21-linux-fanout-5000.json`.

## 2026-10-21, runs 9 to 11: the headline on Linux, three times in a row

Same conditions as run 7, immediately after run 8, JVMs warm.

| Run | Sold | Unexpected | p50 | p95 | p99 | max |
| --- | --- | --- | --- | --- | --- | --- |
| 9 | 100 | 0 | 150 ms | 416 ms | 468 ms | 504 ms |
| 10 | 100 | 0 | 354 ms | 470 ms | 488 ms | 588 ms |
| 11 | 100 | 0 | 187 ms | 353 ms | 378 ms | 411 ms |

**Exactly 100, three times, under a truly simultaneous 10,000.** Warm, the
p99 is under half a second; run 7's 1.8 s was the JIT and the connection
pools warming up on the first stampede. A real drop would be warmed before
the open time.

Summaries: `2026-10-21-linux-headline-10000-repeat{1,2,3}.json`.
