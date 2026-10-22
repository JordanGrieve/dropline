package com.jordangrieve.dropline.web;

import com.jordangrieve.dropline.drop.DropRepository;
import com.jordangrieve.dropline.realtime.StockBroadcaster;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.Meter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The three numbers the Grafana dashboard needs that the agent cannot
 * derive on its own. Registered through the OpenTelemetry API: with the
 * agent attached they export alongside everything else, without it they
 * cost nothing.
 *
 *   dropline.stock.remaining   gauge, read from the stock row at export time
 *   dropline.ws.connections    gauge, this instance's open WebSocket sessions
 *   dropline.purchases         counter, by result: sold, sold_out, not_open
 */
@Component
public class DropMetrics {

    public static final AttributeKey<String> RESULT = AttributeKey.stringKey("result");

    private final LongCounter purchases;

    public DropMetrics(DropRepository drops, StockBroadcaster broadcaster, @Value("${dropline.drop-id}") long dropId) {
        Meter meter = GlobalOpenTelemetry.getMeter("dropline");

        meter.gaugeBuilder("dropline.stock.remaining")
                .setDescription("Units left in the stock row")
                .setUnit("{unit}")
                .ofLongs()
                .buildWithCallback(m -> m.record(drops.remaining(dropId)));

        meter.gaugeBuilder("dropline.ws.connections")
                .setDescription("Open WebSocket sessions on this instance")
                .setUnit("{connection}")
                .ofLongs()
                .buildWithCallback(m -> m.record(broadcaster.connections()));

        purchases = meter.counterBuilder("dropline.purchases")
                .setDescription("Purchase attempts by outcome")
                .setUnit("{purchase}")
                .build();
    }

    public void sold() {
        purchases.add(1, Attributes.of(RESULT, "sold"));
    }

    public void soldOut() {
        purchases.add(1, Attributes.of(RESULT, "sold_out"));
    }

    public void notOpen() {
        purchases.add(1, Attributes.of(RESULT, "not_open"));
    }
}
