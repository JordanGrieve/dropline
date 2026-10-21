package com.jordangrieve.dropline.drop;

import java.time.Instant;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class DropRepository {

    /** The drop joined to its stock row. Read at page load and on each WebSocket connect. */
    public record DropRow(long id, String name, String description, int pricePence, String currency,
                          String imageUrl, Instant opensAt, int totalUnits, int remaining) {}

    private final JdbcClient jdbc;

    public DropRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public DropRow find(long dropId) {
        return jdbc.sql("""
                SELECT d.id, d.name, d.description, d.price_pence, d.currency, d.image_url,
                       d.opens_at, d.total_units, s.remaining
                  FROM drop d
                  JOIN stock s ON s.drop_id = d.id
                 WHERE d.id = :id
                """)
                .param("id", dropId)
                .query((rs, i) -> new DropRow(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getString("description"),
                        rs.getInt("price_pence"),
                        rs.getString("currency"),
                        rs.getString("image_url"),
                        rs.getObject("opens_at", java.time.OffsetDateTime.class).toInstant(),
                        rs.getInt("total_units"),
                        rs.getInt("remaining")))
                .single();
    }

    public Instant opensAt(long dropId) {
        return jdbc.sql("SELECT opens_at FROM drop WHERE id = :id")
                .param("id", dropId)
                .query(java.time.OffsetDateTime.class)
                .single()
                .toInstant();
    }

    public int totalUnits(long dropId) {
        return jdbc.sql("SELECT total_units FROM drop WHERE id = :id")
                .param("id", dropId)
                .query(Integer.class)
                .single();
    }

    public int remaining(long dropId) {
        return jdbc.sql("SELECT remaining FROM stock WHERE drop_id = :id")
                .param("id", dropId)
                .query(Integer.class)
                .single();
    }
}
