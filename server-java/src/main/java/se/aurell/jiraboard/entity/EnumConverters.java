package se.aurell.jiraboard.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stores the enums by their API value ("in-progress"), not their Java name ("IN_PROGRESS"). */
final class EnumConverters {

    private EnumConverters() {
    }

    @Converter
    static class CardStatusConverter implements AttributeConverter<CardStatus, String> {
        @Override
        public String convertToDatabaseColumn(CardStatus status) {
            return status == null ? null : status.getValue();
        }

        @Override
        public CardStatus convertToEntityAttribute(String value) {
            return value == null ? null : CardStatus.fromValue(value);
        }
    }

    @Converter
    static class CardTypeConverter implements AttributeConverter<CardType, String> {
        @Override
        public String convertToDatabaseColumn(CardType type) {
            return type == null ? null : type.getValue();
        }

        @Override
        public CardType convertToEntityAttribute(String value) {
            return value == null ? null : CardType.fromValue(value);
        }
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
}
