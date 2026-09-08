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
    unresolvable cases, which have no natural home outside a deliberately misconfigured fixture.

    source= and <field>_lookup_expression are both reported on any failure to resolve -- whether
    field.source was set explicitly or left to DRF's default (equal to field_name), and whether the
    walk fails on its first segment or partway through a relation. A field is only exempt from
    resolution by one of two explicit opt-outs, never merely because its source was implicit:

    - field.source == "*" (SerializerMethodField forces this; a plain Field that computes its own
      value can set it explicitly the same way -- ObjectRevisionField, AvailableActionsField, and
      AvailableTransitionField all do, since each overrides get_attribute() outright and never
      reads source at runtime).
    - A model defining a callable get_<field_name>(), mirroring the get_formatted_name() convention
      FormattedNameBaseModel._get_formatted_name already reads this way (a model may opt out of a
      generated column, e.g. formatted_name = None, in favor of a plain method).
    """

    def test_serializer_method_field_produces_no_warning(self):
        """computed is a SerializerMethodField; it must never produce a warning."""
        from vueda.info.checks import check_field_source_resolution

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        warnings = check_field_source_resolution(app_configs=None)
        assert all("computed" not in warning.msg for warning in warnings)

    def test_source_star_field_produces_no_warning(self):
        """available_actions has field.source == "*" (AvailableActionsField sets this explicitly, since it overrides get_attribute() and never reads source at runtime); it is excluded from resolution entirely, the same as a SerializerMethodField, and must not warn."""
        from vueda.info.checks import check_field_source_resolution

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        warnings = check_field_source_resolution(app_configs=None)

        assert all("available_actions" not in warning.msg for warning in warnings)

    def test_get_field_name_method_opt_out_produces_no_warning(self):
        """ValidGetFormattedName has formatted_name = None (opting out of the generated column) and a plain get_formatted_name() method; the source= walk fails to resolve "formatted_name" as a model field, but the callable get_formatted_name() is an explicit opt-out, so it must not warn -- even though its source is implicit (defaults to its field name), just like available_actions."""
        from vueda.info.checks import check_field_source_resolution

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.ValidGetFormattedNameSerializer)

        warnings = check_field_source_resolution(app_configs=None)

        assert all("formatted_name" not in warning.msg for warning in warnings)

    def test_implicit_source_field_name_typo_reports_null_and_produces_system_check_warning(self):
        """implicit_typo = CharField(read_only=True) sets no source= at all (defaults to its own field name, which does not exist on the model, and there is no get_implicit_typo() opt-out) -- it is reported the same as an explicit source= failure, since DRF's default gives no way to tell a field-name typo from a deliberate computed field apart from the two explicit opt-outs."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(err_serializers.SourceResolutionSerializer)
        assert fields["implicit_typo"]["type_db"] is None
        assert fields["implicit_typo"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)
        matches = [warning for warning in warnings if "implicit_typo" in warning.msg]

        assert len(matches) == 1
        assert matches[0].id == "vueda_info.W001"
        assert "implicit_typo" in matches[0].hint

    def test_single_segment_explicit_source_typo_reports_null_and_produces_system_check_warning(self):
        """typo = CharField(source="does_not_exist_at_all") fails at its very first segment -- it is reported the same as a source failing partway."""
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(err_serializers.SourceResolutionSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(err_serializers.SourceResolutionSerializer)
        assert fields["typo"]["type_db"] is None
        assert fields["typo"]["type_model"] is None

        warnings = check_field_source_resolution(app_configs=None)
        matches = [warning for warning in warnings if ".typo " in warning.msg]

        assert len(matches) == 1
        assert matches[0].id == "vueda_info.W001"
        assert "does_not_exist_at_all" in matches[0].hint

    def test_get_field_model_info_correction_silences_warning_and_object_revision_stays_silent(self):
        """CustomerOrderSerializer.workflow_state_code/workflow_state_name source through HasWorkflowModelMixin.workflow_state, a real @property with no database column behind it -- unresolvable through source= alone, same as any other explicit source failure. But HasWorkflowSerializerMixin.get_field_model_info fills in their real type (State.code/State.name are both CharField), so the check consults that correction before deciding to warn and finds nothing left to report. object_revision, also unresolvable through source= alone, stays silent for a different reason: its source is "*" (ObjectRevisionField sets this explicitly, the same convention SerializerMethodField uses), so it is excluded from resolution entirely rather than evaluated as an explicit path."""
        from tests.store import serializers as store_serializers
        from vueda.info.checks import check_field_source_resolution
        from vueda.info.serializers import ModelInfoSerializer

        info.registration.get_empty_registry()
        info.register_serializer(store_serializers.CustomerOrderSerializer)

        fields = ModelInfoSerializer().get_model_fields_data(store_serializers.CustomerOrderSerializer)
        fields = store_serializers.CustomerOrderSerializer().get_field_model_info(fields)
        assert fields["workflow_state_code"]["type_db"] == "CharField"
        assert fields["workflow_state_name"]["type_model"] == "CharField"

        warnings = check_field_source_resolution(app_configs=None)

        assert all("workflow_state_code" not in warning.msg for warning in warnings)
        assert all("workflow_state_name" not in warning.msg for warning in warnings)
        assert all("object_revision" not in warning.msg for warning in warnings)

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


@pytest.mark.django_db
class TestFieldResolutionMechanics:
    """Direct coverage of resolve_serializer_field_model_field's own walking rules (PR #228 review),
    below the check/warning layer TestFieldSourceResolutionCheck covers. Reuses tests.store.models.
    CustomerOrder, a real production model with both a real ForeignKey (customer, to Customer) and a
    real DateTimeField (when), rather than adding new fixture models for these cases.
    """

    def test_dunder_in_source_is_not_reinterpreted_as_relation_traversal(self):
        """source="customer__user" has no dot, so it names one literal attribute -- DRF's own getattr()
        looks up "customer__user" as one attribute and fails, since no such attribute exists. The walk
        this replaced used to split on "__" too, incorrectly resolving this as customer -> user and
        reporting Customer.user's type for a source DRF itself can never traverse that way."""
        from rest_framework import serializers as drf_serializers

        from tests.store.models import CustomerOrder
        from vueda.info.field_resolution import resolve_serializer_field_model_field

        field = drf_serializers.CharField(source="customer__user", read_only=True)
        field.bind("fake", None)

        model_field, unresolved_path = resolve_serializer_field_model_field(CustomerOrder, "fake", field)

        assert model_field is None
        assert unresolved_path == "customer__user"

    def test_intermediate_attname_segment_is_not_traversed_as_a_relation(self):
        """source="customer_id.user" resolves "customer_id" to the same ForeignKey field _meta.get_field
        returns for "customer" (both a field's name and its attname resolve to the same field object,
        a documented Django internals quirk), but DRF's real getattr() reads a raw scalar ID off
        customer_id, not a traversable Customer instance -- so a further ".user" is never reachable at
        runtime, and must not be treated as a successful relation traversal even though _meta.get_field
        alone would allow it."""
        from rest_framework import serializers as drf_serializers

        from tests.store.models import CustomerOrder
        from vueda.info.field_resolution import resolve_serializer_field_model_field

        field = drf_serializers.CharField(source="customer_id.user", read_only=True)
        field.bind("fake", None)

        model_field, unresolved_path = resolve_serializer_field_model_field(CustomerOrder, "fake", field)

        assert model_field is None
        assert unresolved_path == "customer_id.user"

    def test_terminal_attname_still_resolves_to_its_field(self):
        """source="customer_id" alone (no further segment after it) still resolves to the same
        ForeignKey field "customer" would, since nothing needs to be read off of it afterward -- only
        using an attname as an intermediate segment is unsafe, never as the terminal one."""
        from rest_framework import serializers as drf_serializers

        from tests.store.models import CustomerOrder
        from vueda.info.field_resolution import resolve_serializer_field_model_field

        field = drf_serializers.CharField(source="customer_id", read_only=True)
        field.bind("fake", None)

        model_field, unresolved_path = resolve_serializer_field_model_field(CustomerOrder, "fake", field)

        assert model_field is CustomerOrder._meta.get_field("customer")
        assert unresolved_path is None

    def test_lookup_expression_transform_resolves_through_django_query_expressions(self, monkeypatch):
        """formatted_name_lookup_expression = "when__year" is a transform, not a relation --
        F("when__year").resolve_expression() is what annotate_formatted_name actually feeds it to, and
        Django accepts it, resolving to the IntegerField behind ExtractYear. A relation-only walk would
        incorrectly reject this as broken even though both annotation and Django admin's lookup_field()
        accept it."""
        from django.db.models import IntegerField
        from rest_framework import serializers as drf_serializers

        from tests.store.models import CustomerOrder
        from vueda.info.field_resolution import resolve_serializer_field_model_field

        monkeypatch.setattr(CustomerOrder, "formatted_name_lookup_expression", "when__year", raising=False)
        field = drf_serializers.CharField(read_only=True)
        field.bind("formatted_name", None)

        model_field, unresolved_path = resolve_serializer_field_model_field(CustomerOrder, "formatted_name", field)

        assert isinstance(model_field, IntegerField)
        assert unresolved_path is None
