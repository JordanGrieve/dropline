// Experiment 1, the headline run.
//
//   N virtual users, each buys once, all at the same moment.
//   Exactly total_units sell. Not one more, not one fewer.
//
// Run with the drop open and at full stock (load/reset.sql does that):
//
//   k6 run -e VUS=10000 --summary-export=../docs/results/headline.json headline.js
//
// The run fails if the sold count or the final stock is wrong, so the
// exit code is the verdict.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const VUS = Number(__ENV.VUS || 10000);
// Seconds over which the buyers' clicks are spread. 0 means every VU
// connects in the same instant, which on Windows hits the OS listen backlog
// cap of ~200 before the app sees anything (docs/results/NOTES.md, run 2).
// On Linux leave it at 0.
const JITTER = Number(__ENV.JITTER || 0);

// 409 is the correct answer for most buyers, not a failure.
http.setResponseCallback(http.expectedStatuses(201, 409));

const sold = new Counter('dropline_sold');
const soldOut = new Counter('dropline_sold_out');
const unexpected = new Counter('dropline_unexpected');
const purchaseLatency = new Trend('dropline_purchase_latency', true);

export const options = {
  scenarios: {
    stampede: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '3m',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    // The correctness thresholds are enforced in teardown. These are the
    // experience numbers to record alongside them.
    dropline_purchase_latency: ['p(95)<2000', 'p(99)<5000'],
    dropline_unexpected: ['count==0'],
  },
};

export function setup() {
  const res = http.get(`${BASE}/api/drop`);
  if (res.status !== 200) throw new Error(`GET /api/drop returned ${res.status}`);
  const drop = res.json();
  if (drop.state !== 'open') throw new Error(`drop is "${drop.state}", not open. Run load/reset.sql first.`);
  if (drop.remaining !== drop.totalUnits) throw new Error(`stock is ${drop.remaining} of ${drop.totalUnits}, not full. Run load/reset.sql first.`);
  console.log(`headline: ${VUS} buyers, ${drop.totalUnits} units, jitter ${JITTER}s`);
  return { totalUnits: drop.totalUnits };
}

export default function () {
  if (JITTER > 0) sleep(Math.random() * JITTER);
  const res = http.post(`${BASE}/api/purchase`, JSON.stringify({ buyerName: `vu-${__VU}` }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'POST /api/purchase' },
  });
  purchaseLatency.add(res.timings.duration);

  if (res.status === 201) sold.add(1);
  else if (res.status === 409) soldOut.add(1);
  else {
    unexpected.add(1);
    if (unexpected.name && __ITER === 0 && __VU % 500 === 1) console.error(`unexpected ${res.status}: ${res.body}`);
  }

  check(res, { 'sold or sold out': (r) => r.status === 201 || r.status === 409 });
}

export function teardown(data) {
  const drop = http.get(`${BASE}/api/drop`).json();
  const soldByDb = data.totalUnits - drop.remaining;
  console.log(`headline: database says ${soldByDb} sold, ${drop.remaining} remaining, state ${drop.state}`);
  if (drop.remaining !== 0) throw new Error(`FAIL: ${drop.remaining} units left unsold`);
  if (soldByDb !== data.totalUnits) throw new Error(`FAIL: ${soldByDb} sold against ${data.totalUnits} units`);
}
