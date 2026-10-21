package com.jordangrieve.dropline.realtime;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final StockWebSocketHandler handler;

    public WebSocketConfig(StockWebSocketHandler handler) {
        this.handler = handler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        // Same origin in production. "*" here because the Vite dev server on
        // 5173 proxies the upgrade and the Origin header is the page's.
        registry.addHandler(handler, "/ws").setAllowedOriginPatterns("*");
    }
}
