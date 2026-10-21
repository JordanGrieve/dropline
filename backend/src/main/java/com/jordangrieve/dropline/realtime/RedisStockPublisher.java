package com.jordangrieve.dropline.realtime;

import com.jordangrieve.dropline.drop.DropState;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Week 4: more than one instance. Every instance publishes each change to
 * one Redis channel and delivers whatever it receives, its own changes
 * included, so all instances deliver the same sequence in the same order.
 *
 * Keep Redis in the same region as the app; cross-region latency eats the
 * benefit. Sticky sessions are not needed while the transport is WebSocket
 * only. See TECH-STACK.md.
 */
public class RedisStockPublisher implements StockPublisher, MessageListener {

    public static final String CHANNEL = "dropline:stock";

    private static final Logger log = LoggerFactory.getLogger(RedisStockPublisher.class);
    private static final Pattern REMAINING = Pattern.compile("\"remaining\"\\s*:\\s*(-?\\d+)");
    private static final Pattern STATE = Pattern.compile("\"state\"\\s*:\\s*\"(\\w+)\"");

    private final StringRedisTemplate redis;
    private final StockBroadcaster broadcaster;

    public RedisStockPublisher(StringRedisTemplate redis, StockBroadcaster broadcaster) {
        this.redis = redis;
        this.broadcaster = broadcaster;
    }

    @Override
    public void publish(int remaining, DropState state) {
        redis.convertAndSend(CHANNEL, StockBroadcaster.json(remaining, state));
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String body = new String(message.getBody(), StandardCharsets.UTF_8);
        Matcher r = REMAINING.matcher(body);
        Matcher s = STATE.matcher(body);
        if (!r.find() || !s.find()) {
            log.warn("ignoring malformed stock message: {}", body);
            return;
        }
        try {
            broadcaster.deliver(Integer.parseInt(r.group(1)), DropState.valueOf(s.group(1)));
        } catch (IllegalArgumentException e) {
            log.warn("ignoring stock message with bad state: {}", body);
        }
    }
}
