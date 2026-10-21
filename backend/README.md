# Dropline backend

Java 21, Spring Boot 4, Postgres, plain WebSocket. The SQL is in
`src/main/resources/db/migration` and `purchase/strategy`; read it as SQL.

## Run locally

Postgres first:

```bash
docker compose -f ../infra/docker-compose.yml up -d
```

Then the app on 8080:

```bash
./gradlew bootRun
```

The seed migration opens the drop two minutes after it first runs. To reopen
it with full stock:

```sql
UPDATE drop  SET opens_at = now() + interval '1 minute' WHERE id = 1;
UPDATE stock SET remaining = 100 WHERE drop_id = 1;
DELETE FROM purchase;
```

With the front end's dev server on 5173 the page proxies `/api` and `/ws`
here.

## If Gradle fails with "Unable to establish loopback connection"

Seen on this Windows machine with Temurin 21.0.12. Java's selector opens its
wake-up pipe over a Unix domain socket, and that socket file lands in a temp
path containing a space, which the connect rejects. Point it at a short path:

```bash
set JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\tmp\jds
```

Set it as a user environment variable to make it stick. The directory has to
exist. Every JVM Gradle starts picks it up, test workers included.

## Tests

```bash
./gradlew test
```

They start a `postgres:16` container through Testcontainers, so Docker has to
be running. Three test classes matter:

- `PurchaseConcurrencyTest`: 500 buyers, 1 unit, exactly 1 sold. 2,000
  buyers, 100 units, exactly 100 sold. Before the drop, nobody can buy.
- `DeliberateOversellTest`: the same stampede with the guard removed, which
  must drive the stock negative. If it ever stops doing so, the concurrency
  test has stopped testing anything.
- `ApiContractTest`: the HTTP shape that `frontend/src/types.ts` expects.

## Endpoints

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/drop` | The drop, stock, state and server time |
| POST | `/api/purchase` | 201 with unit and remaining, 409 sold out, 425 not open, 400 bad name |
| WS | `/ws` | `{"remaining": n, "state": "open"}` on connect and on every change |
| GET | `/actuator/health` | Liveness for the load balancer |
| POST | `/api/demo/simulate` | `{"buyers": 200}` fires that many purchases at once through the real path; returns sold, soldOut, remaining |
| POST | `/api/demo/reset` | Full stock, open now, audit trail cleared |

The two demo routes are the page's "Simulate 200 buyers" and "Reset the
drop" buttons. `DEMO_ENABLED=false` removes them and `GET /api/drop`
reports `demo: false`, so the page hides the panel. Buyers are capped at
2,000 per press; the load numbers still come from k6.

## Strategy

`dropline.purchase.strategy` (or `PURCHASE_STRATEGY`) selects the purchase
strategy. Only `conditional` exists yet; `optimistic` and `pessimistic` are
week 5.
