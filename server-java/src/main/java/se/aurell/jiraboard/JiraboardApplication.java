package se.aurell.jiraboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class JiraboardApplication {

	public static void main(String[] args) {
		SpringApplication.run(JiraboardApplication.class, args);
	}

}
