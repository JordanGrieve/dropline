// The capacity run: how many live viewers before something breaks.
//
//   Ramp WebSocket connections up in steps and hold. Every connection must
//   receive the snapshot on connect, and every broadcast after that.
//
//   k6 run -e MAX=5000 --summary-export=../docs/results/fanout.json fanout.js
//
// A second scenario makes BUYS purchases, spaced out, once every viewer is
// connected and holding. So the expected broadcast count is exact:
// BUYS × MAX. dropline_ws_messages must equal it. Write down the step at
// which errors start and what the error is; that is the capacity number
// SUCCESS.md asks for.

import http from 'k6/http';
import { sleep } from 'k6';
import { WebSocket } from 'k6/websockets';
import { Counter, Gauge } from 'k6/metrics';

const HTTP_BASE = __ENV.BASE_URL || 'http://localhost:8080';
const BASE = HTTP_BASE.replace(/^http/, 'ws');
const MAX = Number(__ENV.MAX || 2000);
const HOLD_S = Number(__ENV.HOLD || 60);
const BUYS = Number(__ENV.BUYS || 5);
const RAMP_S = 90;

const connected = new Counter('dropline_ws_connected');
const snapshots = new Counter('dropline_ws_snapshots');
const messages = new Counter('dropline_ws_messages');
const errors = new Counter('dropline_ws_errors');
const open = new Gauge('dropline_ws_open');
const buys = new Counter('dropline_buys');

export const options = {
  scenarios: {
    viewers: {
      executor: 'ramping-vus',
      exec: 'viewer',
      startVUs: 0,
      stages: [
        { duration: '30s', target: Math.floor(MAX / 4) },
        { duration: '30s', target: Math.floor(MAX / 2) },
        { duration: '30s', target: MAX },
        { duration: `${HOLD_S}s`, target: MAX },
        { duration: '15s', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
    buyers: {
      executor: 'per-vu-iterations',
      exec: 'buyer',
      vus: 1,
      iterations: BUYS,
      // Start 10 s into the hold, finish well before the ramp-down.
      startTime: `${RAMP_S + 10}s`,
      maxDuration: `${HOLD_S - 15}s`,
    },
  },
  thresholds: {
    dropline_ws_errors: ['count==0'],
    dropline_ws_messages: [`count==${BUYS * MAX}`],
  },
};

export function buyer() {
  const res = http.post(`${HTTP_BASE}/api/purchase`, JSON.stringify({ buyerName: `fanout-${__ITER}` }), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status === 201) buys.add(1);
  else console.error(`buyer: purchase returned ${res.status}, is the drop open and stocked?`);
  sleep(Math.max(1, (HOLD_S - 20) / BUYS));
}

export function viewer() {
  const ws = new WebSocket(`${BASE}/ws`);
  let first = true;

  ws.addEventListener('open', () => {
    connected.add(1);
    open.add(1);
  });

  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (typeof m.remaining !== 'number') {
      errors.add(1);
      return;
    }
    if (first) {
      first = false;
      snapshots.add(1);
    } else {
      messages.add(1);
    }
  });

  ws.addEventListener('error', (e) => {
    errors.add(1);
    console.error(`ws error: ${e.error || e}`);
  });

  // Hold the connection for the VU's lifetime; k6 closes it on ramp-down.
  ws.addEventListener('close', () => open.add(-1));
}
