package com.jordangrieve.dropline.purchase;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PurchaseController {

    private static final int MAX_NAME = 80;

    private final PurchaseService purchases;

    public PurchaseController(PurchaseService purchases) {
        this.purchases = purchases;
    }

    @PostMapping("/api/purchase")
    public ResponseEntity<PurchaseResult> purchase(@RequestBody PurchaseRequest request) {
        String name = request.buyerName() == null ? "" : request.buyerName().strip();
        if (name.isEmpty() || name.length() > MAX_NAME) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(purchases.purchase(name));
    }
}
