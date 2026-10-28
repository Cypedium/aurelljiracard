# --- Builder ---
FROM eclipse-temurin:25-jdk AS builder
WORKDIR /build

# Resolve dependencies first so this layer is cached between code changes
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && (./mvnw -B -q dependency:go-offline || true)

COPY src src
RUN ./mvnw -B -q package -DskipTests && cp target/jiraboard-*.jar app.jar

# --- Runner ---
FROM eclipse-temurin:25-jre AS runner
WORKDIR /app

COPY --from=builder /build/app.jar app.jar

# Secrets (DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET, REFRESH_SECRET, CLIENT_URL) come from `fly secrets`.
# Flyway runs the migrations on startup; Hibernate refuses to start if the schema doesn't match.
ENV PORT=8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

EXPOSE 8080
USER ubuntu
CMD ["java", "-jar", "app.jar"]
