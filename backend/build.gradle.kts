plugins {
	java
	id("org.springframework.boot") version "4.1.1"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.jordangrieve"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

// The OpenTelemetry Java agent. Resolved like any dependency, copied to
// build/otel, attached to bootRun with -Potel. No code changes: the agent
// instruments Tomcat, Spring MVC, JDBC, Hikari and WebSocket by itself.
val otelAgent: Configuration by configurations.creating

dependencies {
	otelAgent("io.opentelemetry.javaagent:opentelemetry-javaagent:2.16.0")
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-data-redis")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-jdbc")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.springframework.boot:spring-boot-starter-websocket")
	implementation("org.flywaydb:flyway-database-postgresql")
	runtimeOnly("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-actuator-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-jdbc-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("org.springframework.boot:spring-boot-starter-websocket-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.testcontainers:testcontainers-junit-jupiter")
	testImplementation("org.testcontainers:testcontainers-postgresql")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

val copyOtelAgent by tasks.registering(Copy::class) {
	from(otelAgent)
	into(layout.buildDirectory.dir("otel"))
	rename { "opentelemetry-javaagent.jar" }
}

tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
	if (project.hasProperty("otel")) {
		dependsOn(copyOtelAgent)
		val agent = layout.buildDirectory.file("otel/opentelemetry-javaagent.jar").get().asFile
		jvmArgs("-javaagent:${agent.absolutePath}")
		environment("OTEL_SERVICE_NAME", "dropline")
		environment("OTEL_EXPORTER_OTLP_ENDPOINT", System.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") ?: "http://localhost:4318")
		environment("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
		environment("OTEL_METRIC_EXPORT_INTERVAL", "5000")
		environment("OTEL_LOGS_EXPORTER", "otlp")
		environment("OTEL_RESOURCE_ATTRIBUTES", "deployment.environment=local,service.instance.id=${System.getenv("INSTANCE_ID") ?: "local-1"}")
	}
}
