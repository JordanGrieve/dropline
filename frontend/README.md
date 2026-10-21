# Dropline front end

One page. React, TypeScript, Vite. Design source is the Claude Design canvas;
tokens, type scale and control states are copied from its spec boards into
`src/index.css`.

```bash
npm install
npm run dev
```

Open `http://localhost:5173/?mock` to drive every state without a backend:

| URL | Starts at |
| --- | --- |
| `/?mock` | Countdown, opens after nine seconds, then stock falls on its own |
| `/?mock=open` | Open, 46 left |
| `/?mock=low` | Open, 11 left, one purchase away from the low-stock state |
| `/?mock=soldout` | Sold out |

Without `?mock` the page talks to the backend through Vite's proxy on 8080.
The contract it expects is at the top of `src/types.ts`.

`npm run build` writes `dist/`, which the backend serves as static files.
