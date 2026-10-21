package com.jordangrieve.dropline.purchase;

import java.time.Instant;
import org.springframework.jdbc.core.simple.JdbcClient;

/** Puts the one drop into a known state before a test. */
final class StockFixture {

    private StockFixture() {}

    static void reset(JdbcClient jdbc, long dropId, int units, Instant opensAt) {
        jdbc.sql("DELETE FROM purchase WHERE drop_id = :id").param("id", dropId).update();
        jdbc.sql("UPDATE drop SET total_units = :units, opens_at = :opensAt WHERE id = :id")
                .param("units", units)
                .param("opensAt", java.time.OffsetDateTime.ofInstant(opensAt, java.time.ZoneOffset.UTC))
                .param("id", dropId)
                .update();
        jdbc.sql("UPDATE stock SET remaining = :units, version = 0 WHERE drop_id = :id")
                .param("units", units)
                .param("id", dropId)
                .update();
    }

    static int remaining(JdbcClient jdbc, long dropId) {
        return jdbc.sql("SELECT remaining FROM stock WHERE drop_id = :id").param("id", dropId).query(Integer.class).single();
    }

    static int purchases(JdbcClient jdbc, long dropId) {
        return jdbc.sql("SELECT count(*) FROM purchase WHERE drop_id = :id").param("id", dropId).query(Integer.class).single();
    }
}
