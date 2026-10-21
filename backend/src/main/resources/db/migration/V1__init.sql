-- See docs/DATABASE.md. Three tables: the static drop, the one hot stock
-- row, and the purchase audit trail.

CREATE TABLE drop (
    id           BIGINT PRIMARY KEY,
    name         TEXT        NOT NULL,
    price_pence  INTEGER     NOT NULL CHECK (price_pence >= 0),
    currency     TEXT        NOT NULL DEFAULT 'GBP',
    image_url    TEXT,
    opens_at     TIMESTAMPTZ NOT NULL,
    total_units  INTEGER     NOT NULL CHECK (total_units > 0)
);

CREATE TABLE stock (
    drop_id    BIGINT  PRIMARY KEY REFERENCES drop (id),
    remaining  INTEGER NOT NULL,
    version    BIGINT  NOT NULL DEFAULT 0,
    -- The second guard behind the WHERE clause. Experiment 6 drops it.
    CONSTRAINT stock_remaining_nonnegative CHECK (remaining >= 0)
);

CREATE TABLE purchase (
    id            BIGSERIAL   PRIMARY KEY,
    drop_id       BIGINT      NOT NULL REFERENCES drop (id),
    buyer_name    TEXT        NOT NULL,
    strategy      TEXT        NOT NULL,
    purchased_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX purchase_drop_id_idx ON purchase (drop_id);
