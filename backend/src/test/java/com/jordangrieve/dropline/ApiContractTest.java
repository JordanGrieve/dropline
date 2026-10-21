package com.jordangrieve.dropline;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

/** The HTTP shape the page in frontend/src/types.ts expects. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApiContractTest {

    @LocalServerPort int port;
    @Autowired JdbcClient jdbc;

    private RestClient client() {
        return RestClient.create("http://localhost:" + port);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> drop() {
        return client().get().uri(URI.create("/api/drop")).retrieve().body(Map.class);
    }

    private void open(int units) {
        jdbc.sql("DELETE FROM purchase").update();
        jdbc.sql("UPDATE drop SET total_units = :u, opens_at = now() - interval '1 minute' WHERE id = 1").param("u", units).update();
        jdbc.sql("UPDATE stock SET remaining = :u WHERE drop_id = 1").param("u", units).update();
    }

    @Test
    void dropCarriesEveryFieldThePageReads() {
        open(100);
        var d = drop();
        assertThat(d).containsKeys("name", "description", "pricePence", "currency", "imageUrl", "totalUnits", "opensAt", "remaining", "state", "serverTime", "demo");
        assertThat(d.get("state")).isEqualTo("open");
        assertThat(d.get("remaining")).isEqualTo(100);
        assertThat(Instant.parse((String) d.get("serverTime"))).isAfter(Instant.now().minusSeconds(30));
    }

    @Test
    void purchaseIs201ThenConflictWhenGone() {
        open(1);
        var r = client().post().uri(URI.create("/api/purchase"))
                .body(Map.of("buyerName", "Ada Morgan")).retrieve().body(Map.class);
        assertThat(r).containsEntry("unit", 1).containsEntry("remaining", 0);

        var status = statusOf(() -> client().post().uri(URI.create("/api/purchase"))
                .body(Map.of("buyerName", "Too Late")).retrieve().toBodilessEntity());
        assertThat(status).isEqualTo(HttpStatus.CONFLICT);
        assertThat(drop().get("state")).isEqualTo("soldout");
    }

    @Test
    void purchaseBeforeOpenIs425() {
        jdbc.sql("UPDATE drop SET opens_at = now() + interval '1 hour' WHERE id = 1").update();
        var status = statusOf(() -> client().post().uri(URI.create("/api/purchase"))
                .body(Map.of("buyerName", "Early")).retrieve().toBodilessEntity());
        assertThat(status).isEqualTo(HttpStatus.TOO_EARLY);
        assertThat(drop().get("state")).isEqualTo("before");
    }

    @Test
    void blankNameIs400() {
        open(1);
        var status = statusOf(() -> client().post().uri(URI.create("/api/purchase"))
                .body(Map.of("buyerName", "   ")).retrieve().toBodilessEntity());
        assertThat(status).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @SuppressWarnings("unchecked")
    void simulateSellsExactlyTheStockAndResetPutsItBack() {
        open(100);
        var r = client().post().uri(URI.create("/api/demo/simulate"))
                .body(Map.of("buyers", 200)).retrieve().body(Map.class);
        assertThat(r).containsEntry("buyers", 200).containsEntry("sold", 100)
                .containsEntry("soldOut", 100).containsEntry("failed", 0).containsEntry("remaining", 0);
        assertThat(drop().get("state")).isEqualTo("soldout");

        var reset = client().post().uri(URI.create("/api/demo/reset")).retrieve().body(Map.class);
        assertThat(reset).containsEntry("remaining", 100);
        assertThat(drop().get("state")).isEqualTo("open");
        assertThat(drop().get("remaining")).isEqualTo(100);
        assertThat(jdbc.sql("SELECT count(*) FROM purchase").query(Integer.class).single()).isZero();
    }

    private static HttpStatus statusOf(Runnable call) {
        try {
            call.run();
            return HttpStatus.OK;
        } catch (HttpClientErrorException e) {
            return HttpStatus.valueOf(e.getStatusCode().value());
        }
    }
}
