package com.jordangrieve.dropline.purchase.strategy;

import java.util.OptionalInt;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * The line the whole project turns on. Postgres decides, in one statement.
 * No read, then think, then write. Zero rows affected means sold out.
 */
@Component
@ConditionalOnProperty(name = "dropline.purchase.strategy", havingValue = "conditional", matchIfMissing = true)
public class ConditionalUpdateStrategy implements PurchaseStrategy {

    private final JdbcClient jdbc;

    public ConditionalUpdateStrategy(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public String name() {
        return "conditional";
    }

    @Override
    public OptionalInt reserve(long dropId) {
        return jdbc.sql("""
                UPDATE stock
                   SET remaining = remaining - 1
                 WHERE drop_id = :id AND remaining > 0
                RETURNING remaining
                """)
                .param("id", dropId)
                .query(Integer.class)
                .optional()
                .map(OptionalInt::of)
                .orElse(OptionalInt.empty());
    }
}
