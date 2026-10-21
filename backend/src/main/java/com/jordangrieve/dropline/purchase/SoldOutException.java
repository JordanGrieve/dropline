package com.jordangrieve.dropline.purchase;

/** Zero rows affected. Mapped to 409. */
public class SoldOutException extends RuntimeException {
    public SoldOutException() {
        super("Sold out");
    }
}
