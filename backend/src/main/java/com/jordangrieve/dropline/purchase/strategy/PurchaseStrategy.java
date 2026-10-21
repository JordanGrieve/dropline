package com.jordangrieve.dropline.purchase.strategy;

import java.util.OptionalInt;

/**
 * Takes one unit from the stock row, or reports that none was available.
 * Runs inside the purchase transaction. Three implementations are planned
 * and measured against each other; see docs/DATABASE.md.
 */
public interface PurchaseStrategy {

    /** Short name recorded on each purchase row, e.g. "conditional". */
    String name();

    /**
     * @return the units remaining after taking one, or empty when the stock
     *         was already at zero and nothing was taken.
     */
    OptionalInt reserve(long dropId);
}
