package com.jordangrieve.dropline.web;

import com.jordangrieve.dropline.purchase.NotOpenException;
import com.jordangrieve.dropline.purchase.SoldOutException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiErrors {

    @ExceptionHandler(SoldOutException.class)
    public ResponseEntity<Map<String, String>> soldOut(SoldOutException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "SOLD_OUT"));
    }

    @ExceptionHandler(NotOpenException.class)
    public ResponseEntity<Map<String, String>> notOpen(NotOpenException e) {
        return ResponseEntity.status(HttpStatus.TOO_EARLY)
                .body(Map.of("error", "NOT_OPEN", "opensAt", e.opensAt().toString()));
    }
}
