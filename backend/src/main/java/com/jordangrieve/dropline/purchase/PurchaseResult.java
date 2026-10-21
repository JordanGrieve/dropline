package com.jordangrieve.dropline.purchase;

/** The shape of a 201 from POST /api/purchase. Mirrors PurchaseResult in frontend/src/types.ts. */
public record PurchaseResult(int unit, int remaining) {}
