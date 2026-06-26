import pytest

from tests.erring import models as err_models
from tests.erring import serializers as err_serializers
from vueda import info


@pytest.mark.django_db
class TestFormattedNameChecks:
    def test_property_formatted_name_system_check_error(self):
        """PropertyFormattedName decorates get_formatted_name with @property; check must flag it as E003."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.PropertyFormattedNameSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "PropertyFormattedName.get_formatted_name is decorated with @property.",
                hint="Remove the @property decorator; get_formatted_name() must be a plain method.",
                obj=err_models.PropertyFormattedName,
                id="vueda_info.E003",
            )
        ]

    def test_both_formatted_name_options_system_check_error(self):
        """BothFormattedNameConfigured has both a lookup expression and get_formatted_name(); check must flag it."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.BothFormattedNameConfiguredSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "BothFormattedNameConfigured defines both formatted_name_lookup_expression and get_formatted_name().",
                hint=(
                    "Use formatted_name_lookup_expression for DB field lookups, "
                    "or get_formatted_name() for computed values — not both."
                ),
                obj=err_models.BothFormattedNameConfigured,
                id="vueda_info.E002",
            )
        ]

    def test_formatted_name_expression_not_string(self):
        """FormattedNameExpressionNotString has a lookup expression that is not a string; check must flag it."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.FormattedNameExpressionNotStringSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "FormattedNameExpressionNotString defines formatted_name_lookup_expression as something other than a string.",
                hint=("formatted_name_lookup_expression is used by DB field lookups, so it must be a string."),
                obj=err_models.FormattedNameExpressionNotString,
                id="vueda_info.E004",
            )
        ]

    def test_model_without_formatted_name_override_passes_system_check(self):
        """A model that does not override formatted_name should be skipped by the check (no errors)."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.NoExpandableFieldsDataSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == []

    def test_model_with_falsey_formatted_name_expression_fails_system_check(self):
        """A model that does not override formatted_name should be skipped by the check (no errors)."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.FalseyFormattedNamesLookupSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "FalseyFormattedNamesLookup defines formatted_name_lookup_expression as something other than a string.",
                hint=("formatted_name_lookup_expression is used by DB field lookups, so it must be a string."),
                obj=err_models.FalseyFormattedNamesLookup,
                id="vueda_info.E004",
            )
        ]

    def test_valid_get_formatted_name_passes_system_check(self):
        """ValidGetFormattedName sets formatted_name=None with a plain get_formatted_name() method; check must produce no errors."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ValidGetFormattedNameSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == []

    def test_valid_lookup_expression_passes_system_check(self):
        """ValidLookupExpression sets formatted_name=None with a string lookup expression; check must produce no errors."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ValidLookupExpressionSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == []

    def test_no_name_field_system_check_error(self):
        """NoNameField has formatted_name = None with no lookup expression or get_formatted_name(); check must flag it."""
        from django.core.checks import Error

        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.NoNameFieldSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == [
            Error(
                "NoNameField sets formatted_name = None but provides no alternative.",
                hint=(
                    "Set formatted_name_lookup_expression to a DB field name, "
                    "or define get_formatted_name() on the model."
                ),
                obj=err_models.NoNameField,
                id="vueda_info.E001",
            )
        ]
