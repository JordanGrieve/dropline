package com.jordangrieve.dropline.realtime;

import com.jordangrieve.dropline.drop.DropState;

/**
 * Where a stock change goes after it has committed. One instance delivers
 * straight to its own connections; more than one goes through Redis so
 * every instance delivers to its own.
 */
public interface StockPublisher {
    void publish(int remaining, DropState state);
}
