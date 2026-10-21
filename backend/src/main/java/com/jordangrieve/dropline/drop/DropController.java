package com.jordangrieve.dropline.drop;

import java.time.Clock;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DropController {

    private final DropRepository drops;
    private final Clock clock;
    private final long dropId;
    private final boolean demo;

    public DropController(DropRepository drops, Clock clock, @Value("${dropline.drop-id}") long dropId,
                          Environment env) {
        this.drops = drops;
        this.clock = clock;
        this.dropId = dropId;
        this.demo = env.getProperty("dropline.demo.enabled", Boolean.class, true);
    }

    @GetMapping("/api/drop")
    public DropInfo drop() {
        var row = drops.find(dropId);
        Instant now = clock.instant();
        return new DropInfo(
                row.name(), row.description(), row.pricePence(), row.currency(), row.imageUrl(),
                row.totalUnits(), row.opensAt(), row.remaining(),
                DropInfo.stateOf(row.opensAt(), row.remaining(), now),
                now,
                demo);
    }
}
