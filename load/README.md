# Load tests

k6, part of the build from week 3. The load test is the acceptance test.

Every run writes its summary to `docs/results/` with the date, the script
and the load level in the file name, so a number is never without the
conditions it was measured under.

## Before a run

1. Postgres and otel-lgtm up: `docker compose -f infra/docker-compose.yml up -d`
2. The app with the agent: `cd backend && ./gradlew bootRun -Potel`
3. The drop open and full:

```bash
docker exec -i infra-postgres-1 psql -U dropline -d dropline < load/reset.sql
```

## Scripts

| Script | Experiment | What it asserts |
| --- | --- | --- |
| `headline.js` | 1, the headline | N buyers, exactly `total_units` sold, stock ends at 0 |
| `fanout.js` | capacity | WebSocket viewers ramped to MAX, every one receives every broadcast |

```bash
cd load
STATS='min,med,p(90),p(95),p(99),max'
k6 run -e VUS=10000 --summary-trend-stats="$STATS" --summary-export=../docs/results/$(date +%F)-headline-10000.json headline.js
k6 run -e MAX=2000  --summary-trend-stats="$STATS" --summary-export=../docs/results/$(date +%F)-fanout-2000.json fanout.js
```

`headline.js` exits non-zero if the sold count or the final stock is wrong.
The exit code is the verdict; the summary is the evidence.

**On Windows add `-e JITTER=5`** (seconds) to `headline.js`. Windows caps the
TCP listen backlog at about 200 whatever the app asks for, so a truly
simultaneous stampede is refused by the OS before Tomcat sees it. See
`docs/results/NOTES.md`, run 2. On Linux leave jitter at 0.

## Reading the numbers

- `dropline_purchase_latency` p50, p95, p99 are the experience. The average
  hides the buyer who waited nine seconds.
- `dropline_unexpected` is anything that was not 201 or 409. It must be zero
  for the correctness claim to stand; if it is not, the run still tells you
  what broke first.
- `dropline_ws_messages` should rise by the connection count on every
  purchase during a fan-out run.

Traces for the run are in Grafana at http://localhost:3000, Explore, Tempo.
