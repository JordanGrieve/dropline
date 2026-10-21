package com.jordangrieve.dropline.realtime;

import com.jordangrieve.dropline.drop.DropInfo;
import com.jordangrieve.dropline.drop.DropRepository;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

/**
 * Plain handler, not STOMP. There is nothing to subscribe to but the one
 * channel. Every new connection gets the current value straight away, so a
 * client that reconnects needs no replay.
 */
@Component
public class StockWebSocketHandler extends TextWebSocketHandler {

    private static final int SEND_TIMEOUT_MS = 2_000;
    private static final int SEND_BUFFER_BYTES = 64 * 1024;

    private final StockBroadcaster broadcaster;
    private final DropRepository drops;
    private final Clock clock;
    private final long dropId;

    public StockWebSocketHandler(StockBroadcaster broadcaster, DropRepository drops, Clock clock,
                                 @Value("${dropline.drop-id}") long dropId) {
        this.broadcaster = broadcaster;
        this.drops = drops;
        this.clock = clock;
        this.dropId = dropId;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession raw) {
        // Serialises sends per session and drops a client that cannot keep up,
        // rather than letting one slow reader stall the broadcast.
        var session = new ConcurrentWebSocketSessionDecorator(raw, SEND_TIMEOUT_MS, SEND_BUFFER_BYTES);
        broadcaster.add(session);
        var row = drops.find(dropId);
        broadcaster.sendTo(session, row.remaining(), DropInfo.stateOf(row.opensAt(), row.remaining(), clock.instant()));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        broadcaster.remove(session);
    }
}
