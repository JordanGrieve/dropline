# What success looks like

Not "it works". A thing that works is the floor, and it is also what every
other candidate's side project claims.

Success here is a set of numbers, and a failure I caused on purpose to prove
the numbers mean something.

## The headline

> **10,000 virtual users. 100 units. Exactly 100 sold.**

Not 99. Not 101. Exactly 100, every run, with the evidence to show it.

That is the sentence this project exists to earn.

## The numbers to capture

| Measure | Why it matters |
| --- | --- |
| **Units sold against units in stock** | The correctness number. The only one that has to be exact. Everything else is a trade-off; this is pass or fail. |
| **p50, p95, p99 latency** under load | An average hides the buyer who waited nine seconds. The tail is the experience. |
| **Max concurrent connections before errors** | The capacity number, and the one that leads to "what broke first". |
| **Error rate at each load level** | Where it degrades, and whether it degrades gracefully or falls over. |
| **Database conflict rate per strategy** | The cost of each concurrency approach, which is the interesting comparison. |

Every number gets recorded with the conditions it was measured under. A
latency figure without the load level attached is noise.

## The six experiments

These are the project. The code is what makes them possible.

**1. The headline run.**
10,000 virtual users, 100 units. Assert exactly 100 sold, none oversold, none
left unsold. Repeat it enough times to know it is not luck.

**2. The three strategies compared.**
The same load against the conditional UPDATE, optimistic locking and
`SELECT FOR UPDATE`. Throughput, p50, p95, p99 and conflict rate for each,
in one table. This is the most interesting thing in the whole writeup, because
almost nobody measures it.

**3. Kill an instance mid-drop.**
With clients connected to it. What do those clients see? How long until they
recover? Does anything get sold twice or lost?

**4. Drop a client's network mid-drop.**
Does the counter resume correctly, without missing events or replaying them?

**5. Move the bottleneck.**
Push until the database is the limit. Put a queue in front of the write.
Measure again. Say what it cost and what it bought.

**6. Break the guard on purpose.**
Remove `AND remaining > 0`, run the same load, and capture stock going
negative.

Experiment 6 is what makes the other five believable. Without it, "it never
oversold" is a claim about a thing that was never tested. With it, there is a
graph of the failure next to a graph of the fix.

## Definition of done

The project is finished when all of these are true:

- [x] The headline run passes repeatedly, and the evidence is saved.
      (Runs 9 to 11 in `docs/results/NOTES.md`: 10,000 simultaneous buyers,
      two instances on Linux, exactly 100 sold each time. 21 October 2026.)
- [ ] All three concurrency strategies are implemented and measured.
- [ ] The deliberate oversell has been produced and captured.
- [ ] An instance has been killed mid-drop and the behaviour documented.
- [ ] The breaking point is known, with a number and a cause.
- [x] Traces from a real load run are in Grafana and screenshotted.
      (`docs/results/2026-10-21-trace-purchase-409.jpg`, 21 October 2026)
- [ ] It has run on AWS across more than one instance, and been torn down.
- [ ] The page meets WCAG 2.2 AA, with the live region behaviour actually
      tested rather than assumed. See ACCESSIBILITY.md.
- [ ] The writeup is published on jordangrieve.com and linked from the repo.
- [ ] The repo has a description, a README, and a name a human recognises.

That last line is there because it is the mistake I have already made with
Postbox: excellent work that nobody can find.

## The writeup

The actual deliverable. Same shape as the DFYNE case studies:

1. The problem in one sentence, with the number in it.
2. What each concurrency strategy cost, as a table.
3. What broke first, at what load, and what I changed.
4. The oversell I caused deliberately, with the graph.
5. What I would do differently with more time.

## What would make this a failure

- It works and nobody ever loaded it properly. Then it is a demo.
- The numbers exist but only in my terminal history.
- The scope grew and the concurrency work got the leftover time.
- It ends up on GitHub as `drop-app` with no description, like the others.
