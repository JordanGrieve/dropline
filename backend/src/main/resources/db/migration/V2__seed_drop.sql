-- The one drop. No admin panel: change it here or with SQL.
-- opens_at is two minutes after this migration first runs, so a fresh
-- local database shows the countdown, then the drop.

INSERT INTO drop (id, name, price_pence, currency, image_url, opens_at, total_units)
VALUES (1, 'Dropline Watch, Edition 001', 25000, 'GBP', NULL, now() + interval '2 minutes', 100);

INSERT INTO stock (drop_id, remaining, version)
VALUES (1, 100, 0);
