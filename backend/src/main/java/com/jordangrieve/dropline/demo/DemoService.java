package com.jordangrieve.dropline.demo;

import com.jordangrieve.dropline.drop.DropRepository;
import com.jordangrieve.dropline.drop.DropState;
import com.jordangrieve.dropline.purchase.NotOpenException;
import com.jordangrieve.dropline.purchase.PurchaseService;
import com.jordangrieve.dropline.purchase.SoldOutException;
import com.jordangrieve.dropline.realtime.StockPublisher;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * The stampede from PurchaseConcurrencyTest, exposed to the page so a
 * visitor can watch it happen. Every simulated buyer goes through the real
 * PurchaseService, so the counter they see is the real guard at work.
 */
@Service
@ConditionalOnProperty(name = "dropline.demo.enabled", havingValue = "true", matchIfMissing = true)
public class DemoService {

    /** Enough to show the guard; small enough that nobody can use it as a load tool. */
    public static final int MAX_BUYERS = 2000;

    private final PurchaseService purchases;
    private final DropRepository drops;
    private final JdbcClient jdbc;
    private final TransactionTemplate tx;
    private final StockPublisher publisher;
    private final long dropId;

    public DemoService(PurchaseService purchases, DropRepository drops, JdbcClient jdbc,
                       TransactionTemplate tx, StockPublisher publisher,
                       @Value("${dropline.drop-id}") long dropId) {
        this.purchases = purchases;
        this.drops = drops;
        this.jdbc = jdbc;
        this.tx = tx;
        this.publisher = publisher;
        this.dropId = dropId;
    }

    /** Fires n purchases at once: every thread waits on one latch, then goes. */
    public SimulationResult simulate(int buyers) throws InterruptedException {
        int n = Math.max(1, Math.min(MAX_BUYERS, buyers));
        var go = new CountDownLatch(1);
        var ready = new CountDownLatch(n);
        var sold = new AtomicInteger();
        var soldOut = new AtomicInteger();
        var notOpen = new AtomicInteger();
        var failed = new AtomicInteger();

        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<?>> futures = new ArrayList<>(n);
            for (int i = 0; i < n; i++) {
                String buyer = String.format("sim-%04d", i + 1);
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    go.await();
                    try {
                        purchases.purchase(buyer);
                        sold.incrementAndGet();
                    } catch (SoldOutException e) {
                        soldOut.incrementAndGet();
                    } catch (NotOpenException e) {
                        notOpen.incrementAndGet();
                    } catch (RuntimeException e) {
                        failed.incrementAndGet();
                    }
                    return null;
                }));
            }
            ready.await();
            go.countDown();
            for (var f : futures) {
                try {
                    f.get();
                } catch (java.util.concurrent.ExecutionException e) {
                    failed.incrementAndGet();
                }
            }
        }

        return new SimulationResult(n, sold.get(), soldOut.get(), notOpen.get(), failed.get(),
                drops.remaining(dropId));
    }

    /** Full stock, open now, audit trail cleared. The same three statements as backend/README.md. */
    public int reset() {
        int total = tx.execute(status -> {
            jdbc.sql("DELETE FROM purchase WHERE drop_id = :id").param("id", dropId).update();
            jdbc.sql("UPDATE drop SET opens_at = now() WHERE id = :id").param("id", dropId).update();
            int units = drops.totalUnits(dropId);
            jdbc.sql("UPDATE stock SET remaining = :units, version = 0 WHERE drop_id = :id")
                    .param("units", units)
                    .param("id", dropId)
                    .update();
            return units;
        });
        publisher.publish(total, DropState.open);
        return total;
    }
}
