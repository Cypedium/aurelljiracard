package se.aurell.jiraboard;

import org.springframework.boot.SpringApplication;

/** Runs the API locally against a throwaway Postgres container: ./mvnw spring-boot:test-run */
public class TestJiraboardApplication {

	public static void main(String[] args) {
		SpringApplication.from(JiraboardApplication::main).with(TestcontainersConfiguration.class)
				.withAdditionalProfiles("dev")
				.run(args);
	}

}
