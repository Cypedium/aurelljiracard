package se.aurell.jiraboard.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stores the enum by its API value ("admin"), not its Java name ("ADMIN"). */
final class EnumConverters {

    private EnumConverters() {
    }

    @Converter
    static class RoleConverter implements AttributeConverter<Role, String> {
        @Override
        public String convertToDatabaseColumn(Role role) {
            return role == null ? null : role.getValue();
        }

        @Override
        public Role convertToEntityAttribute(String value) {
            return value == null ? null : Role.fromValue(value);
        }
    }

    // null = the user hasn't picked a language (the CHECK in V13 allows only known values)
    @Converter
    static class LanguageConverter implements AttributeConverter<Language, String> {
        @Override
        public String convertToDatabaseColumn(Language language) {
            return language == null ? null : language.getValue();
        }

        @Override
        public Language convertToEntityAttribute(String value) {
            return value == null ? null : Language.parse(value).orElse(null);
        }
    }
}
