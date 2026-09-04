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

    def test_non_vueda_model_skips_formatted_name_check(self):
        """NonVuedaFormattedName is a plain model (no VuedaModel heritage); formatted name checks must be skipped entirely."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.NonVuedaFormattedNameSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        assert errors == []

    def test_expandable_model_with_no_formatted_name_found_by_system_check(self):
        """The enhanced check scans expandable_fields; NoNameField is not registered directly but is flagged because it appears in RelatedObjectsAreMissingDataSerializer.expandable_fields."""
        from vueda.info.checks import check_formatted_name_configuration

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.RelatedObjectsAreMissingDataSerializer)

        errors = check_formatted_name_configuration(app_configs=None)

        error_objs = {e.obj for e in errors}
        assert err_models.RelatedObjectsAreMissingData in error_objs
        assert err_models.NoNameField in error_objs
        assert all(e.id == "vueda_info.E001" for e in errors)


@pytest.mark.django_db
class TestFieldSourceResolutionCheck:
    """Regression coverage for the vueda_info.W001 system check (issue #207).

    Coverage for ModelInfoSerializer.get_model_fields_data's own field.source resolution when it
    succeeds (a source-mapped field, a dotted source, a traversing lookup expression, and a
    SerializerMethodField) lives against the real tests.store fixtures in
    tests.unit.info.test_model_info instead: PackingBoxSerializer.label, CartSerializer.
    customer_relation, Customer/CartItem/OrderItem/InventoryRecord/OrderItemCompositePK's
    formatted_name, and CustomerSerializer.number_of_ordered_products. This class covers the
    unresolvable cases, which have no natural home outside a deliberately misconfigured fixture,
    plus the asymmetry between source= and <field>_lookup_expression: a source= failing at its
    very first segment stays silent (it may legitimately point at a @property or other computed
    value), but a lookup_expression failing the same way still warns, since it is fed straight to
    models.F() for queryset annotation and to Django admin's lookup_field() and so has no
    legitimate non-model-backed reading.
    """

    def test_serializer_method_field_produces_no_warning(self):
        """computed is a SerializerMethodField; it must never produce a warning."""
        from vueda.info.checks import check_field_source_resolution

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        warnings = check_field_source_resolution(app_configs=None)
        assert all("computed" not in warning.msg for warning in warnings)

    def test_default_source_field_that_is_not_model_backed_produces_no_warning(self):
        """available_actions has no explicit source (defaults to its field name) and is not a model field; this is a normal computed field, not a misconfiguration, so it must not warn."""
        from vueda.info.checks import check_field_source_resolution

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        warnings = check_field_source_resolution(app_configs=None)

        assert all("available_actions" not in warning.msg for warning in warnings)

    def test_single_segment_source_typo_reports_null_without_warning(self):
        """typo = CharField(source="does_not_exist_at_all") has no dot, so it fails at its very first segment: null model types, but no warning, since that's just as likely to be an intentional @property/computed value as a mistake."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(err_serializers.SourceResolutionSerializer)
        assert fields["typo"]["type_db"] is None
        assert fields["typo"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)
        assert all("typo" not in warning.msg for warning in warnings)

    def test_real_property_backed_source_produces_no_warning(self):
        """CustomerOrderSerializer.workflow_state_code/workflow_state_name source through HasWorkflowModelMixin.workflow_state, a real @property with no database column behind it. This is the actual production case the first-segment exemption exists to protect, not just a synthetic analog of it."""
        from tests.store import serializers as store_serializers
        from vueda.info.checks import check_field_source_resolution

        info.registration.get_empty_registry()
        info.register_serializer(store_serializers.CustomerOrderSerializer)

        warnings = check_field_source_resolution(app_configs=None)

        assert all("workflow_state_code" not in warning.msg for warning in warnings)
        assert all("workflow_state_name" not in warning.msg for warning in warnings)

    def test_unresolvable_source_reports_null_and_produces_system_check_warning(self):
        """bogus = CharField(source="related.does_not_exist") resolves "related" but not "does_not_exist" -- partial progress. Reports null model types rather than raising, and is reported as a warning through the source= hint (offering get_field_model_info as one option), naming the serializer, field, and path."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(err_serializers.SourceResolutionSerializer)
        assert fields["bogus"]["type_db"] is None
        assert fields["bogus"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)
        matches = [warning for warning in warnings if "bogus" in warning.msg]

        assert len(matches) == 1
        assert matches[0].id == "vueda_info.W001"
        assert "SourceResolutionSerializer" in matches[0].msg
        assert "related.does_not_exist" in matches[0].hint
        assert "get_field_model_info" in matches[0].hint

    def test_source_through_non_relation_field_reports_null_and_produces_system_check_warning(self):
        """through_non_relation = CharField(source="formatted_name.foo") resolves "formatted_name" (a real field) but can't continue past it, since a CharField/GeneratedField isn't a relation -- also partial progress, also warned, but through the NotRelationField branch of the walk rather than FieldDoesNotExist."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(err_serializers.SourceResolutionSerializer)
        assert fields["through_non_relation"]["type_db"] is None
        assert fields["through_non_relation"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)
        matches = [warning for warning in warnings if "through_non_relation" in warning.msg]

        assert len(matches) == 1
        assert matches[0].id == "vueda_info.W001"
        assert "formatted_name.foo" in matches[0].hint

    def test_unresolvable_lookup_expression_reports_null_and_produces_system_check_warning(self):
        """formatted_name_lookup_expression = "related__does_not_exist" resolves the relation but not the terminal field name: null model types rather than raising, plus a warning through the lookup_expression hint, which does not offer get_field_model_info as an option -- unlike source=, a lookup_expression has no legitimate non-model-backed reading."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.UnresolvableLookupExpressionSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(err_serializers.UnresolvableLookupExpressionSerializer)
        assert fields["formatted_name"]["type_db"] is None
        assert fields["formatted_name"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)

        assert len(warnings) == 1
        assert warnings[0].id == "vueda_info.W001"
        assert "UnresolvableLookupExpressionSerializer" in warnings[0].msg
        assert "formatted_name" in warnings[0].msg
        assert "related__does_not_exist" in warnings[0].hint
        assert "get_field_model_info" not in warnings[0].hint

    def test_unresolvable_lookup_expression_at_first_segment_reports_null_and_produces_system_check_warning(self):
        """formatted_name_lookup_expression = "does_not_exist" fails at its very first segment -- unlike a source= failing the same way, this still warns, since a lookup_expression is fed straight to models.F() for queryset annotation and to Django admin's lookup_field(), both DB-level operations that can never reach a @property or method."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.UnresolvableLookupExpressionAtFirstSegmentSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(
            err_serializers.UnresolvableLookupExpressionAtFirstSegmentSerializer
        )
        assert fields["formatted_name"]["type_db"] is None
        assert fields["formatted_name"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)

        assert len(warnings) == 1
        assert warnings[0].id == "vueda_info.W001"
        assert "UnresolvableLookupExpressionAtFirstSegmentSerializer" in warnings[0].msg
        assert "formatted_name" in warnings[0].msg
        assert "does_not_exist" in warnings[0].hint
        assert "get_field_model_info" not in warnings[0].hint
