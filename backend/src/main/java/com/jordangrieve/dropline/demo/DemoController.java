package com.jordangrieve.dropline.demo;

import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Two buttons on the page. Off with DEMO_ENABLED=false, in which case these
 * routes do not exist and GET /api/drop reports demo: false so the page
 * hides the panel.
 */
@RestController
@ConditionalOnBean(DemoService.class)
public class DemoController {

    public record SimulateRequest(Integer buyers) {}

    private final DemoService demo;

    public DemoController(DemoService demo) {
        this.demo = demo;
    }

    @PostMapping("/api/demo/simulate")
    public SimulationResult simulate(@RequestBody(required = false) SimulateRequest request) throws InterruptedException {
        int buyers = request == null || request.buyers() == null ? 200 : request.buyers();
        return demo.simulate(buyers);
    }

    @PostMapping("/api/demo/reset")
    public Map<String, Integer> reset() {
        return Map.of("remaining", demo.reset());
    }
}
