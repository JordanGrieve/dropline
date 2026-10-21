package com.jordangrieve.dropline.drop;

import java.time.Instant;

/** The shape of GET /api/drop. Mirrors DropInfo in frontend/src/types.ts. */
public record DropInfo(
        String name,
        String description,
        int pricePence,
        String currency,
        String imageUrl,
        int totalUnits,
        Instant opensAt,
        int remaining,
        DropState state,
        Instant serverTime,
        /** Whether the simulate and reset buttons exist on this deployment. */
        boolean demo) {

    public static DropState stateOf(Instant opensAt, int remaining, Instant now) {
        if (remaining <= 0) return DropState.soldout;
        if (now.isBefore(opensAt)) return DropState.before;
        return DropState.open;
    }
}
