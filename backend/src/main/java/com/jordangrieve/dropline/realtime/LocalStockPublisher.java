package com.jordangrieve.dropline.realtime;

import com.jordangrieve.dropline.drop.DropState;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Weeks 1 to 3: one instance, so a change goes straight to this instance's viewers. */
@Component
@ConditionalOnProperty(name = "dropline.fanout", havingValue = "local", matchIfMissing = true)
public class LocalStockPublisher implements StockPublisher {

    private final StockBroadcaster broadcaster;

    public LocalStockPublisher(StockBroadcaster broadcaster) {
        this.broadcaster = broadcaster;
    }

    @Override
    public void publish(int remaining, DropState state) {
        broadcaster.deliver(remaining, state);
    }
}
