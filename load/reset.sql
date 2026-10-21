-- Put the drop back to open and full before a load run.
--
--   docker exec -i infra-postgres-1 psql -U dropline -d dropline < load/reset.sql

DELETE FROM purchase WHERE drop_id = 1;
UPDATE drop  SET opens_at = now() - interval '1 minute' WHERE id = 1;
UPDATE stock SET remaining = (SELECT total_units FROM drop WHERE id = 1), version = 0 WHERE drop_id = 1;
SELECT remaining FROM stock WHERE drop_id = 1;
