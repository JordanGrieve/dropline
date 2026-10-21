# Tech stack

Every choice here has a reason, and the reason is either "it is the right tool"
or "it closes a gap that has been costing me interviews". Both are legitimate.
Where it is the second, it says so.

## Backend: Java 21, Spring Boot 4

**Chosen to close a gap, and the gap is large.**

Glasgow is a Java city. JPMorgan has a very large Glasgow engineering
presence, and Lloyds, BAE, RSE, Harris and FDM are all Java shops. Every one
of those has either rejected me or been filtered out by my own rule of
skipping Java adverts. That rule has been costing me more than the missing
language has.

Java also happens to be the best language for the observability half of this
project, because the OpenTelemetry Java agent auto-instruments the application
from the command line with no code changes.

Spring Boot because it is what those employers actually run. Spring Boot 4 is
the current line as of October 2026 and is what Spring Initializr produces;
the data access is `JdbcClient` with the SQL written out, no JPA.

## Real time: Spring WebSocket, plain handler

Not STOMP, for v1.

STOMP is a messaging protocol on top of WebSocket and it brings subscriptions,
destinations and a broker relay. This project broadcasts one number to
everybody. STOMP would be more machinery than the problem needs, and being
able to say why I did not use it is worth more than using it.

If the waiting room gets built later and clients need per-user messages as
well as broadcasts, revisit.

## Database: Postgres

Already known, so the learning budget goes on Java rather than on SQL.

More importantly: Postgres is the arbiter of stock, not the application. The
whole correctness argument rests on the database doing the deciding.

```sql
UPDATE stock
   SET remaining = remaining - 1
 WHERE id = ? AND remaining > 0
RETURNING remaining;
```

No read, then think, then write. No lock held open across a network call.
Zero rows affected means sold out.

The other two strategies exist to be measured against this one:

- **Optimistic locking** with a version column. The UPDATE carries the
  original version in its WHERE clause and a conflicting save fails loudly.
- **Pessimistic locking** with `SELECT ... FOR UPDATE`. Correct, and the
  question is what it costs under contention.

## Fan-out: Redis pub/sub

Needed the moment there is more than one application instance, which is the
point of week 4. Without it, a server only knows about its own clients and the
counter desynchronises between them.

Two things to know before deploying it:

- **Keep Redis in the same region as the app.** Cross region latency eats the
  benefit entirely.
- **Sticky sessions are required** on the load balancer unless the transport
  is WebSockets only. Server-Sent Events and long polling both need them, and
  a backplane does not remove that requirement.

## Front end: React, TypeScript, Vite

The design was produced in Claude Design as a stateful component with four
phases and two moments, and React is the natural way to carry that structure
into code: one `DropPage`, a hook that owns the server state and the clock,
and small components for the opening line, the counter, the form and the
status panel.

What keeps the scope tiny is not the absence of a framework but the absence
of everything else: no component library, no state library, no router. One
page, plain CSS with the design's tokens as custom properties, and every
number on the page read from the backend.

One exception, made on purpose: the request-path illustration on the
backend page uses Magic UI's Animated Beam, which brings the `motion`
library and Tailwind. Tailwind is loaded as utilities only, with no
preflight reset, so the page's own CSS stays in charge; the Magic UI file
lives under `components/ui` unchanged so it can be updated from the
registry.

The earlier plan was plain HTML to evidence that skill directly. That
evidence is given up here in favour of matching the design; the plain CSS,
the accessibility work and the WebSocket handling still show it.

Build: Vite. Output is static files that Spring Boot serves from the same
origin in production, so there is no CORS and the WebSocket connects to the
host the page came from. In development Vite proxies `/api` and `/ws` to the
backend on 8080.

A mock client behind `?mock` (and `?mock=open`, `?mock=low`,
`?mock=soldout`) drives every state without a backend, for design review
and for the accessibility probes.

## Observability: OpenTelemetry Java agent into grafana/otel-lgtm

**Do not build an observability stack.** It is a project in itself and it is
not this project.

`grafana/otel-lgtm` is the whole backend in one container: the OpenTelemetry
Collector, metrics, traces, logs and Grafana. It is explicitly for development
and demos rather than production, which is fine here, and saying so in the
writeup shows the difference is understood.

The Collector receives signals on **4317** (gRPC) and **4318** (HTTP). Point
the Java agent at one of those.

This builds on real experience rather than starting from zero: Dash0 and
OpenTelemetry are already part of the DFYNE work.

## Load testing: k6

Use the **`k6/websockets`** module.

`k6/experimental/websockets` is deprecated, and the old docs.k6.io site is out
of date. Take guidance from grafana.com only. This will otherwise cost an
evening.

k6 is part of the build from week 3, not a thing run once at the end. The load
test is the acceptance test.

## Hosting: AWS, as a demo target

**Chosen to close a gap.** jordangrieve.com claims AWS and GCP, and every
project is on Vercel, Cloudflare or Cloud Run. That is a question I do not
want asked.

Shape: two application instances behind a load balancer, managed Postgres,
managed Redis.

**Cost discipline, before anything is deployed:**

- Set a budget alert and a spend limit in AWS Settings **first**.
- That shape running continuously is roughly £50 to £100 a month, and nobody
  is paying it but me.
- Deploy, measure, tear down the same day.
- A single small EC2 running Docker Compose covers most of the exercise for a
  fraction of the cost. If that is the route taken, say so in the writeup
  rather than implying a production deployment.

## Infrastructure as code: Terraform, if time allows

Nice to have. First thing to cut if week 4 runs long.

## What is explicitly not here

- **Kubernetes.** Two instances behind a load balancer does not need an
  orchestrator, and adding one would be a different project.
- **A message broker** such as Kafka or RabbitMQ, until experiment 5 proves
  the write path needs a queue. Then it is a measured decision rather than a
  default.
- **An ORM-heavy data layer.** The interesting SQL is three statements long
  and should be readable as SQL.
- **A CI pipeline beyond the basics.** Typecheck, tests, build. That is it.
