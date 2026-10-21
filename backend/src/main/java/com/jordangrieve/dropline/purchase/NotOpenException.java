package com.jordangrieve.dropline.purchase;

import java.time.Instant;

/** The drop has not opened yet. Mapped to 425 Too Early. */
public class NotOpenException extends RuntimeException {
    private final Instant opensAt;

    public NotOpenException(Instant opensAt) {
        super("Drop opens at " + opensAt);
        this.opensAt = opensAt;
    }

    public Instant opensAt() {
        return opensAt;
    }
}
