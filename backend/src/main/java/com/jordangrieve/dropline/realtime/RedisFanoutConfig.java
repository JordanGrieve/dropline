package com.jordangrieve.dropline.realtime;

import java.util.concurrent.Executors;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
@ConditionalOnProperty(name = "dropline.fanout", havingValue = "redis")
public class RedisFanoutConfig {

    @Bean
    public RedisStockPublisher redisStockPublisher(StringRedisTemplate redis, StockBroadcaster broadcaster) {
        return new RedisStockPublisher(redis, broadcaster);
    }

    @Bean
    public RedisMessageListenerContainer stockListenerContainer(RedisConnectionFactory factory,
                                                                RedisStockPublisher publisher) {
        var container = new RedisMessageListenerContainer();
        container.setConnectionFactory(factory);
        // One dispatch thread. The default hands every message to a fresh
        // thread, and deliveries overtake each other: a viewer could see 10
        // then 99. The counter must only ever go down, so order is kept.
        container.setTaskExecutor(Executors.newSingleThreadExecutor(r -> {
            var t = new Thread(r, "stock-fanout");
            t.setDaemon(true);
            return t;
        }));
        container.addMessageListener(publisher, new ChannelTopic(RedisStockPublisher.CHANNEL));
        return container;
    }
}
