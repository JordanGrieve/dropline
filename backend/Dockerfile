# syntax=docker/dockerfile:1.7
# Builds the Spring Boot jar and bundles the OpenTelemetry agent. The agent
# is attached at runtime when OTEL_ENABLED is set, so the same image runs
# with or without instrumentation.

FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew build.gradle.kts settings.gradle.kts ./
COPY gradle gradle
# Warm the Gradle and dependency caches in a layer that only changes when
# the build files do.
RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon --quiet dependencies > /dev/null 2>&1 || true
COPY src src
RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon --quiet bootJar copyOtelAgent -x test \
 && cp build/libs/*.jar /app.jar \
 && cp build/otel/opentelemetry-javaagent.jar /otel.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app.jar app.jar
COPY --from=build /otel.jar otel.jar
EXPOSE 8080
# OTEL_ENABLED=1 attaches the agent; the OTEL_* environment does the rest.
ENTRYPOINT ["sh", "-c", "exec java ${OTEL_ENABLED:+-javaagent:/app/otel.jar} ${JAVA_OPTS:-} -jar /app/app.jar"]
