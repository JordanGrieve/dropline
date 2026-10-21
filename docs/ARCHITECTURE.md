# Architecture

Two views. The first is what runs where in week 4. The second is what
happens when one buyer presses the button.

## The deployed shape

```mermaid
graph LR
    subgraph Clients
        V["Viewers<br/>browser, plain JS"]
        K["k6<br/>10,000 VUs"]
    end

    subgraph AWS["AWS, one region, torn down the same day"]
        LB["Load balancer<br/>WebSocket aware"]
        subgraph Apps["Application tier"]
            A1["App instance 1<br/>Spring Boot + OTel agent"]
            A2["App instance 2<br/>Spring Boot + OTel agent"]
        end
        PG[("Postgres<br/>the arbiter of stock")]
        RD[("Redis<br/>pub/sub fan-out")]
    end

    subgraph Obs["Observability"]
        LGTM["grafana/otel-lgtm<br/>collector :4317 :4318<br/>traces, metrics, logs, Grafana"]
    end

    V -- "HTTP + WebSocket" --> LB
    K -- "HTTP + WebSocket" --> LB
    LB --> A1
    LB --> A2
    A1 -- "UPDATE ... WHERE remaining > 0" --> PG
    A2 -- "UPDATE ... WHERE remaining > 0" --> PG
    A1 <-- "publish / subscribe stock" --> RD
    A2 <-- "publish / subscribe stock" --> RD
    A1 -. "OTLP" .-> LGTM
    A2 -. "OTLP" .-> LGTM
```

Weeks 1 to 3 are the same picture with one app instance and no Redis or
load balancer. Nothing in the code changes shape between the two. The
Redis fan-out is the only addition.

## One purchase, end to end

```mermaid
sequenceDiagram
    actor Buyer
    participant Page as Page (app.js)
    participant App as App instance 1
    participant PG as Postgres
    participant RD as Redis
    participant App2 as App instance 2
    participant Others as Every other viewer

    Buyer->>Page: presses Buy
    Page->>App: POST /purchase {name}
    App->>PG: UPDATE stock SET remaining = remaining - 1<br/>WHERE drop_id = 1 AND remaining > 0<br/>RETURNING remaining
    alt one row returned
        PG-->>App: remaining = 42
        App->>PG: INSERT INTO purchase
        App-->>Page: 200 {remaining: 42}
        Page-->>Buyer: "Yours. 42 left."
        App->>Others: WebSocket {remaining: 42} to its own clients
        App->>RD: PUBLISH stock 42
        RD->>App2: message stock 42
        App2->>Others: WebSocket {remaining: 42} to its clients
    else zero rows returned
        PG-->>App: no rows
        App-->>Page: 409 sold out
        Page-->>Buyer: "Sold out", focus moved to the message
    end
```

The decision happens inside Postgres on one statement. The application
never reads the stock, thinks, and then writes. There is no window for two
instances to both see one unit and both sell it.

## What flows over the WebSocket

One message type, one number.

```json
{ "remaining": 42 }
```

Plus two state messages: `{ "state": "open" }` at drop time and
`{ "state": "soldout" }` when the last unit goes. The page derives
everything else. This is why STOMP is not here. There is nothing to
subscribe to but the one channel.

## Ordering across instances

With Redis in the path, every instance publishes to one channel and
delivers whatever it receives, its own changes included. So all instances
deliver the same sequence. One trap, found by the fan-out test: Spring's
listener container hands each message to a new thread by default, and
deliveries overtake each other. A viewer could see 10 then 99. The
container is given a single dispatch thread so the counter only ever goes
down.

## Reconnection

A client that drops and reconnects does not need a replay. The server sends
the current `remaining` on every new connection, and the current value is
the only value that matters. This is what experiment 4 tests.

## What the load balancer must do

- Pass WebSocket upgrades through.
- Health check each instance so that experiment 3, killing one mid-drop,
  routes new connections to the survivor.
- Sticky sessions are not needed while the transport is WebSocket only.
  If SSE or long polling ever appears, they are.

## Where each experiment lives in this picture

| Experiment | Where it bites |
| --- | --- |
| 1. Headline run | k6 through the load balancer, the Postgres row at the end |
| 2. Three strategies | Inside the app instances, measured at Postgres |
| 3. Kill an instance | App instance 1 goes away, its viewers reconnect via the LB |
| 4. Drop a client's network | The Page to LB link, the reconnection path |
| 5. Move the bottleneck | Between the app tier and Postgres, where a queue would go |
| 6. Break the guard | The `WHERE` clause on the arrow into Postgres |
