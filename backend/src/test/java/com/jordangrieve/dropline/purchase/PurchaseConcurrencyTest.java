package com.jordangrieve.dropline.purchase;

import static org.assertj.core.api.Assertions.assertThat;

import com.jordangrieve.dropline.TestcontainersConfiguration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * Week 1's acceptance test. Many buyers, few units, exactly that many sold.
 * No network in the way: this calls the service directly, so the only
 * thing under test is the SQL and the transaction around it.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class PurchaseConcurrencyTest {

    private static final long DROP_ID = 1;

    @Autowired PurchaseService purchases;
    @Autowired JdbcClient jdbc;

    @Test
    void fiveHundredBuyersOneUnitExactlyOneWins() throws Exception {
        StockFixture.reset(jdbc, DROP_ID, 1, Instant.now().minusSeconds(60));

        Outcome o = stampede(500);

        assertThat(o.sold).hasValue(1);
        assertThat(o.soldOut).hasValue(499);
        assertThat(o.other).hasValue(0);
        assertThat(StockFixture.remaining(jdbc, DROP_ID)).isZero();
        assertThat(StockFixture.purchases(jdbc, DROP_ID)).isEqualTo(1);
    }

    @Test
    void twoThousandBuyersOneHundredUnitsExactlyOneHundredSold() throws Exception {
        StockFixture.reset(jdbc, DROP_ID, 100, Instant.now().minusSeconds(60));

        Outcome o = stampede(2000);

        assertThat(o.sold).hasValue(100);
        assertThat(o.soldOut).hasValue(1900);
        assertThat(o.other).hasValue(0);
        assertThat(StockFixture.remaining(jdbc, DROP_ID)).isZero();
        assertThat(StockFixture.purchases(jdbc, DROP_ID)).isEqualTo(100);
        assertThat(o.units).doesNotHaveDuplicates().hasSize(100);
    }

    @Test
    void beforeTheDropNobodyCanBuy() throws Exception {
        StockFixture.reset(jdbc, DROP_ID, 100, Instant.now().plusSeconds(3600));

        Outcome o = stampede(50);

        assertThat(o.sold).hasValue(0);
        assertThat(o.notOpen).hasValue(50);
        assertThat(StockFixture.remaining(jdbc, DROP_ID)).isEqualTo(100);
    }

    /** Fires n purchases at once: every thread waits on one latch, then goes. */
    private Outcome stampede(int n) throws Exception {
        var go = new CountDownLatch(1);
        var ready = new CountDownLatch(n);
        var o = new Outcome();
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<?>> futures = new ArrayList<>(n);
            for (int i = 0; i < n; i++) {
                String buyer = "buyer-" + i;
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    go.await();
                    try {
                        var r = purchases.purchase(buyer);
                        o.sold.incrementAndGet();
                        synchronized (o.units) { o.units.add(r.unit()); }
                    } catch (SoldOutException e) {
                        o.soldOut.incrementAndGet();
                    } catch (NotOpenException e) {
                        o.notOpen.incrementAndGet();
                    } catch (RuntimeException e) {
                        o.other.incrementAndGet();
                        o.failures.add(e.toString());
                    }
                    return null;
                }));
            }
            ready.await();
            go.countDown();
            for (var f : futures) f.get();
        }
        if (!o.failures.isEmpty()) {
            System.err.println("unexpected failures: " + o.failures.subList(0, Math.min(5, o.failures.size())));
        }
        return o.freeze();
    }

    private static final class Outcome {
        final AtomicInteger sold = new AtomicInteger(), soldOut = new AtomicInteger(),
                notOpen = new AtomicInteger(), other = new AtomicInteger();
        final List<Integer> units = new ArrayList<>();
        final List<String> failures = java.util.Collections.synchronizedList(new ArrayList<>());

        Outcome freeze() { return this; }
    }
}
