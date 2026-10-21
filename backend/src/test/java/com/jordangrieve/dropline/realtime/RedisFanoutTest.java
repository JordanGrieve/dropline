package com.jordangrieve.dropline.realtime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.jordangrieve.dropline.drop.DropState;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.testcontainers.containers.GenericContainer;

/**
 * Two instances, one Redis. A change published on one must reach the
 * viewers of both, in the same order. No Spring context: the two instances
 * are wired by hand so the test is about the fan-out and nothing else.
 */
class RedisFanoutTest {

    static final GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    static LettuceConnectionFactory factory1, factory2;
    static RedisMessageListenerContainer container1, container2;

    @BeforeAll
    static void start() {
        redis.start();
    }

    @AfterAll
    static void stop() {
        for (var c : List.of(container1, container2)) if (c != null) c.stop();
        for (var f : List.of(factory1, factory2)) if (f != null) f.destroy();
        redis.stop();
    }

    /** One "instance": its own connection factory, template, listener container, broadcaster and publisher. */
    record Instance(RedisStockPublisher publisher, StockBroadcaster broadcaster, List<String> received) {}

    static Instance instance(int n) {
        var factory = new LettuceConnectionFactory(new RedisStandaloneConfiguration(redis.getHost(), redis.getMappedPort(6379)));
        factory.afterPropertiesSet();
        var template = new StringRedisTemplate(factory);

        var broadcaster = new StockBroadcaster();
        var received = new CopyOnWriteArrayList<String>();
        WebSocketSession viewer = mock(WebSocketSession.class);
        when(viewer.isOpen()).thenReturn(true);
        when(viewer.getId()).thenReturn("viewer-" + n);
        try {
            doAnswer(inv -> { received.add(((TextMessage) inv.getArgument(0)).getPayload()); return null; })
                    .when(viewer).sendMessage(any());
        } catch (java.io.IOException e) {
            throw new AssertionError(e);
        }
        broadcaster.add(viewer);

        var publisher = new RedisStockPublisher(template, broadcaster);
        var container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        // As in RedisFanoutConfig: one dispatch thread, or order is lost.
        container.setTaskExecutor(java.util.concurrent.Executors.newSingleThreadExecutor());
        container.addMessageListener(publisher, new ChannelTopic(RedisStockPublisher.CHANNEL));
        container.afterPropertiesSet();
        container.start();

        if (n == 1) { factory1 = factory; container1 = container; } else { factory2 = factory; container2 = container; }
        return new Instance(publisher, broadcaster, received);
    }

    @Test
    void aChangeOnOneInstanceReachesTheViewersOfBoth() {
        var a = instance(1);
        var b = instance(2);
        // Subscriptions are asynchronous; wait until both are listening.
        await().atMost(Duration.ofSeconds(10)).until(() -> container1.isListening() && container2.isListening());

        a.publisher().publish(99, DropState.open);
        b.publisher().publish(10, DropState.open);
        a.publisher().publish(0, DropState.soldout);

        var expected = List.of(
                "{\"remaining\":99,\"state\":\"open\"}",
                "{\"remaining\":10,\"state\":\"open\"}",
                "{\"remaining\":0,\"state\":\"soldout\"}");
        await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
            assertThat(a.received()).containsExactlyElementsOf(expected);
            assertThat(b.received()).containsExactlyElementsOf(expected);
        });
    }
}
