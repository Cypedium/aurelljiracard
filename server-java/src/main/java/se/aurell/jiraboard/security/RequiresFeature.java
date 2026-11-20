package se.aurell.jiraboard.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import se.aurell.jiraboard.entity.Feature;

/**
 * The endpoint belongs to a feature the site admin can switch off; then everyone but site admins gets
 * 503 "This feature is temporarily disabled." ({@link FeatureInterceptor}). Called {@code @Feature} in
 * docs/feature-switches.md; renamed so it doesn't clash with the {@link Feature} enum.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequiresFeature {
    Feature value();
}
