package com.jordangrieve.dropline.purchase;

import com.jordangrieve.dropline.drop.DropInfo;
import com.jordangrieve.dropline.drop.DropRepository;
import com.jordangrieve.dropline.purchase.strategy.PurchaseStrategy;
import com.jordangrieve.dropline.realtime.StockPublisher;
import java.time.Clock;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PurchaseService {

    private final PurchaseStrategy strategy;
    private final DropRepository drops;
    private final JdbcClient jdbc;
    private final TransactionTemplate tx;
    private final StockPublisher publisher;
    private final Clock clock;
    private final long dropId;

    public PurchaseService(PurchaseStrategy strategy, DropRepository drops, JdbcClient jdbc,
                           TransactionTemplate tx, StockPublisher publisher, Clock clock,
                           @Value("${dropline.drop-id}") long dropId) {
        this.strategy = strategy;
        this.drops = drops;
        this.jdbc = jdbc;
        this.tx = tx;
        this.publisher = publisher;
        this.clock = clock;
        this.dropId = dropId;
    }

    /**
     * One purchase. The decrement and the audit row commit together; the
     * broadcast goes out only after the commit, so no viewer ever sees a
     * number that was rolled back.
     */
    public PurchaseResult purchase(String buyerName) {
        Instant opensAt = drops.opensAt(dropId);
        if (clock.instant().isBefore(opensAt)) {
            throw new NotOpenException(opensAt);
        }

        PurchaseResult result = tx.execute(status -> {
            var remaining = strategy.reserve(dropId);
            if (remaining.isEmpty()) {
                throw new SoldOutException();
            }
            jdbc.sql("""
                    INSERT INTO purchase (drop_id, buyer_name, strategy)
                    VALUES (:dropId, :buyer, :strategy)
                    """)
                    .param("dropId", dropId)
                    .param("buyer", buyerName)
                    .param("strategy", strategy.name())
                    .update();
            int total = drops.totalUnits(dropId);
            return new PurchaseResult(total - remaining.getAsInt(), remaining.getAsInt());
        });

        publisher.publish(result.remaining(), DropInfo.stateOf(opensAt, result.remaining(), clock.instant()));
        return result;
    }
}
