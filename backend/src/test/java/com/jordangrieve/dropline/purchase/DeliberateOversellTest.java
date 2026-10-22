package com.jordangrieve.dropline.purchase;

import static org.assertj.core.api.Assertions.assertThat;

import com.jordangrieve.dropline.TestcontainersConfiguration;
import com.jordangrieve.dropline.drop.DropRepository;
import com.jordangrieve.dropline.purchase.strategy.PurchaseStrategy;
import com.jordangrieve.dropline.realtime.StockPublisher;
import com.jordangrieve.dropline.web.DropMetrics;
import java.time.Clock;
import java.time.Instant;
import java.util.OptionalInt;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Experiment 6, kept as a test. Remove the guard and the stock goes negative.
 * SCOPE.md: if removing "AND remaining > 0" does not make the concurrency
 * test fail, the test is broken, and nothing after that point means
 * anything. This pins that failure so it can never silently stop happening.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class DeliberateOversellTest {

    private static final long DROP_ID = 1;

    @Autowired JdbcClient jdbc;
    @Autowired DropRepository drops;
    @Autowired TransactionTemplate tx;
    @Autowired StockPublisher publisher;
    @Autowired DropMetrics metrics;
    @Autowired Clock clock;

    /** The same UPDATE with the guard taken out. Test scope only, on purpose. */
    static final class UnguardedUpdateStrategy implements PurchaseStrategy {
        private final JdbcClient jdbc;
        UnguardedUpdateStrategy(JdbcClient jdbc) { this.jdbc = jdbc; }

        @Override public String name() { return "unguarded"; }

        @Override public OptionalInt reserve(long dropId) {
            // Read, then think, then write. The canonical race. The pause is
            // the "think": any real work between the read and the write,
            // without it the window is too small to hit reliably.
            int seen = jdbc.sql("SELECT remaining FROM stock WHERE drop_id = :id").param("id", dropId).query(Integer.class).single();
            if (seen <= 0) return OptionalInt.empty();
            try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            int after = jdbc.sql("UPDATE stock SET remaining = remaining - 1 WHERE drop_id = :id RETURNING remaining")
                    .param("id", dropId).query(Integer.class).single();
            return OptionalInt.of(after);
        }
    }

    @AfterEach
    void restoreTheConstraint() {
        jdbc.sql("ALTER TABLE stock ADD CONSTRAINT stock_remaining_nonnegative CHECK (remaining >= 0) NOT VALID").update();
        StockFixture.reset(jdbc, DROP_ID, 100, Instant.now().minusSeconds(60));
    }

    @Test
    void withoutTheGuardTheStockGoesNegative() throws Exception {
        jdbc.sql("ALTER TABLE stock DROP CONSTRAINT stock_remaining_nonnegative").update();
        StockFixture.reset(jdbc, DROP_ID, 1, Instant.now().minusSeconds(60));

        var unguarded = new PurchaseService(new UnguardedUpdateStrategy(jdbc), drops, jdbc, tx, publisher, metrics, clock, DROP_ID);

        int n = 500;
        var go = new CountDownLatch(1);
        var sold = new AtomicInteger();
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < n; i++) {
                String buyer = "buyer-" + i;
                pool.submit(() -> {
                    go.await();
                    try {
                        unguarded.purchase(buyer);
                        sold.incrementAndGet();
                    } catch (SoldOutException ignored) {
                    }
                    return null;
                });
            }
            go.countDown();
        }

        int remaining = StockFixture.remaining(jdbc, DROP_ID);
        System.err.printf("unguarded: %d sold from 1 unit, remaining = %d%n", sold.get(), remaining);

        assertThat(sold.get()).as("more than one buyer got the single unit").isGreaterThan(1);
        assertThat(remaining).as("stock went negative").isNegative();
        assertThat(StockFixture.purchases(jdbc, DROP_ID)).isEqualTo(sold.get());
    }
}
