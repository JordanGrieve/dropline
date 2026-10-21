package com.jordangrieve.dropline.realtime;

import com.jordangrieve.dropline.drop.DropState;
import java.io.IOException;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

/**
 * Pushes one number to every connection on this instance. Week 4 adds a
 * Redis fan-out so that other instances do the same; this class does not
 * change shape for that, it just gains a second caller.
 */
@Component
public class StockBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(StockBroadcaster.class);

    private final Set<WebSocketSession> sessions = new CopyOnWriteArraySet<>();

    void add(WebSocketSession session) {
        sessions.add(session);
    }

    void remove(WebSocketSession session) {
        sessions.remove(session);
    }

    public int connections() {
        return sessions.size();
    }

    public void publish(int remaining, DropState state) {
        TextMessage message = new TextMessage(json(remaining, state));
        for (WebSocketSession s : sessions) {
            send(s, message);
        }
    }

    void sendTo(WebSocketSession session, int remaining, DropState state) {
        send(session, new TextMessage(json(remaining, state)));
    }

    private void send(WebSocketSession s, TextMessage message) {
        try {
            if (s.isOpen()) s.sendMessage(message);
        } catch (IOException | IllegalStateException e) {
            log.debug("dropping session {}: {}", s.getId(), e.toString());
            sessions.remove(s);
        }
    }

    /** One message type, one number. See docs/ARCHITECTURE.md. */
    static String json(int remaining, DropState state) {
        return "{\"remaining\":" + remaining + ",\"state\":\"" + state.name() + "\"}";
    }
}
