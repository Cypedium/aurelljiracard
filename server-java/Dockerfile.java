# Build: Maven wrapper + JDK 25. Tests are skipped here — they need Docker (Testcontainers)
FROM eclipse-temurin:25-jdk AS build

WORKDIR /app

# Download dependencies first so this layer is cached between code changes
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src src
RUN ./mvnw -B -q package -DskipTests && cp target/*.jar app.jar

# Run: JRE only
FROM eclipse-temurin:25-jre

WORKDIR /app

RUN useradd --system --no-create-home spring
COPY --from=build /app/app.jar app.jar

# Secrets (DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET, REFRESH_SECRET, CLIENT_URL) come from `fly secrets`
ENV PORT=8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"

EXPOSE 8080

USER spring

CMD ["java", "-jar", "app.jar"]
