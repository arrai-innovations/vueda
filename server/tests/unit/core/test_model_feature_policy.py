"""Coverage for the ``class Vueda`` model feature policy: resolution, inheritance, and checks."""

import pytest
from django.apps import apps
from django.core.checks import Error
from django.core.exceptions import FieldDoesNotExist
from django.core.exceptions import ImproperlyConfigured
from django.db import models
from django.db.migrations.state import ModelState
from django.test.utils import isolate_apps

from tests.features import models as feature_models
from vueda.core.checks import check_model_feature_declaration
from vueda.core.checks import check_model_feature_policy
from vueda.core.features import FeatureOption
from vueda.core.features import FeatureSection
from vueda.core.features import get_feature_sections
from vueda.core.features import register_feature_section
from vueda.core.models import Lookup
from vueda.core.models import VuedaModel
from vueda.core.options import get_vueda_options


@pytest.fixture
def without_workflow_section(monkeypatch):
    """Drop the Workflow section registration, standing in for an installation without the app.

    History is not a candidate: every supported configuration installs it.
    """
    import vueda.core.features as features

    sections = dict(features._SECTIONS)
    sections.pop("Workflow")
    monkeypatch.setattr(features, "_SECTIONS", sections)


class TestResolution:
    def test_undeclared_model_uses_registered_defaults(self):
        options = get_vueda_options(feature_models.PlainProbe)

        assert options["Probe"]["enabled"] is False
        assert options["History"]["enabled"] is True
        assert options["Workflow"]["enabled"] is False
        assert options.problems == []

    def test_every_registered_section_is_present(self):
        assert set(get_vueda_options(feature_models.PlainProbe)) == set(get_feature_sections())

    def test_section_reads_as_attribute_and_as_mapping(self):
        section = get_vueda_options(feature_models.ProbeTracked)["Probe"]

        assert section.label == "tracked"
        assert section["label"] == "tracked"
        assert dict(section)["label"] == "tracked"

    def test_unknown_option_raises_attribute_error(self):
        section = get_vueda_options(feature_models.PlainProbe)["Probe"]

        with pytest.raises(AttributeError, match="has no option 'nope'"):
            _ = section.nope

    def test_is_enabled_covers_unregistered_sections(self):
        options = get_vueda_options(feature_models.ProbeTracked)

        assert options.is_enabled("Probe") is True
        assert options.is_enabled("NotRegistered") is False

    def test_is_declared_separates_an_explicit_choice_from_a_default(self):
        declared = get_vueda_options(feature_models.ProbeTracked)["Probe"]
        defaulted = get_vueda_options(feature_models.PlainProbe)["Probe"]

        assert declared.is_declared("label") is True
        assert defaulted.is_declared("label") is False

    def test_migration_values_returns_only_migration_relevant_options(self):
        section = get_vueda_options(feature_models.ProbeTracked)["Probe"]

        assert section.migration_values() == {"label": "tracked"}

    def test_a_non_vueda_model_has_no_policy(self):
        with pytest.raises(TypeError, match="does not subclass a VUEDA model base"):
            get_vueda_options(models.Model)


class TestInheritance:
    def test_an_abstract_declaration_reaches_a_concrete_subclass(self):
        assert get_vueda_options(feature_models.ProbeTracked)["Probe"]["enabled"] is True

    def test_a_subclass_overrides_one_option_without_redeclaring_the_section(self):
        section = get_vueda_options(feature_models.ProbeOptedOut)["Probe"]

        assert section["enabled"] is False
        assert section["tags"] == ("base",)

    def test_a_feature_supplied_merge_accumulates_across_bases(self):
        assert get_vueda_options(feature_models.ProbeTracked)["Probe"]["tags"] == ("base", "child")

    def test_a_first_party_option_replaces_its_inherited_value_by_default(self):
        assert get_vueda_options(feature_models.ProbeTracked)["History"]["exclude_fields"] == ("token",)

    def test_multiple_inheritance_resolves_by_method_resolution_order(self):
        section = get_vueda_options(feature_models.ProbeMulti)["Probe"]

        assert section["label"] == "from-a"
        assert section["enabled"] is True
        assert section["tags"] == ("b", "a")

    def test_a_lookup_model_carries_policy(self):
        assert get_vueda_options(feature_models.ProbeLookup)["Probe"]["enabled"] is True

    def test_multi_table_children_resolve_policy_independently(self):
        with isolate_apps("tests.features"):

            class ConcreteParent(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Probe:
                        enabled = True
                        label = "parent"

                class Meta:
                    app_label = "features"

            class InheritingChild(ConcreteParent):
                class Meta:
                    app_label = "features"

            class DisabledChild(ConcreteParent):
                class Vueda:
                    class Probe:
                        enabled = False
                        label = ""

                class Meta:
                    app_label = "features"

            class RelabelledChild(ConcreteParent):
                class Vueda:
                    class Probe:
                        label = "child"

                class Meta:
                    app_label = "features"

            class DisabledParent(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Probe:
                        enabled = False

                class Meta:
                    app_label = "features"

            class EnabledChild(DisabledParent):
                class Vueda:
                    class Probe:
                        enabled = True
                        label = "enabled-child"

                class Meta:
                    app_label = "features"

            assert dict(get_vueda_options(ConcreteParent)["Probe"]) == {
                "enabled": True,
                "label": "parent",
                "tags": (),
            }
            assert dict(get_vueda_options(InheritingChild)["Probe"]) == {
                "enabled": True,
                "label": "parent",
                "tags": (),
            }
            assert dict(get_vueda_options(DisabledChild)["Probe"]) == {
                "enabled": False,
                "label": "",
                "tags": (),
            }
            assert dict(get_vueda_options(RelabelledChild)["Probe"]) == {
                "enabled": True,
                "label": "child",
                "tags": (),
            }
            assert dict(get_vueda_options(EnabledChild)["Probe"]) == {
                "enabled": True,
                "label": "enabled-child",
                "tags": (),
            }


class TestProxyModels:
    def test_a_proxy_shares_the_sections_of_its_concrete_model(self):
        proxy = get_vueda_options(feature_models.ProbeProxy)
        concrete = get_vueda_options(feature_models.ProbeTracked)

        assert dict(proxy["Probe"]) == dict(concrete["Probe"])
        assert proxy.model is feature_models.ProbeProxy

    def test_a_proxy_declaration_is_a_check_error(self):
        with isolate_apps("tests.features"):

            class ProxiedBase(VuedaModel):
                name = models.CharField(max_length=255)

                class Meta:
                    app_label = "features"

            class DeclaringProxy(ProxiedBase):
                class Vueda:
                    class Probe:
                        enabled = True

                class Meta:
                    app_label = "features"
                    proxy = True

            errors = check_model_feature_declaration(DeclaringProxy)

        assert [error.id for error in errors] == ["vueda_core.E014"]
        assert "proxy model" in errors[0].msg


class TestContributors:
    def test_an_enabled_model_receives_the_contributed_field(self):
        assert feature_models.ProbeTracked._meta.get_field("probe_note").default == "tracked"

    def test_a_disabled_model_receives_nothing(self):
        for model in (feature_models.PlainProbe, feature_models.ProbeOptedOut):
            with pytest.raises(FieldDoesNotExist):
                model._meta.get_field("probe_note")

    def test_a_contributed_field_reaches_migration_state(self):
        """A migration-relevant option stays visible to migration generation through the model state."""
        fields = dict(ModelState.from_model(feature_models.ProbeTracked).fields)

        assert "probe_note" in fields
        assert fields["probe_note"].default == "tracked"

    def test_a_contributor_does_not_run_again_for_a_proxy(self):
        assert "probe_note" not in [field.name for field in feature_models.ProbeProxy._meta.local_fields]

    def test_multi_table_children_receive_exact_policy_without_field_clashes(self):
        """Model names here stay unique across the file.

        History attaches a generated event model to the app's models module, and ``isolate_apps``
        rolls back the app registry but not that module attribute. Reusing a model name in a second
        test would collide with the event model the first test left behind.
        """
        with isolate_apps("tests.features"):

            class EnabledParent(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Probe:
                        enabled = True
                        label = "parent"

                class Meta:
                    app_label = "features"

            class DisabledMultiTableChild(EnabledParent):
                class Vueda:
                    class Probe:
                        enabled = False
                        label = ""

                class Meta:
                    app_label = "features"

            class RelabelledChild(EnabledParent):
                class Vueda:
                    class Probe:
                        label = "child"

                class Meta:
                    app_label = "features"

            class DisabledParent(VuedaModel):
                name = models.CharField(max_length=255)

                class Meta:
                    app_label = "features"

            class EnabledChild(DisabledParent):
                class Vueda:
                    class Probe:
                        enabled = True
                        label = "enabled-child"

                class Meta:
                    app_label = "features"

            assert EnabledParent.__dict__["probe_policy_label"] == "parent"
            assert DisabledMultiTableChild.__dict__["probe_policy_label"] is None
            assert RelabelledChild.__dict__["probe_policy_label"] == "child"
            assert DisabledParent.__dict__["probe_policy_label"] is None
            assert EnabledChild.__dict__["probe_policy_label"] == "enabled-child"
            assert "probe_note" not in [field.name for field in DisabledMultiTableChild._meta.local_fields]
            assert "probe_note" not in [field.name for field in RelabelledChild._meta.local_fields]
            assert "probe_note" not in [field.name for field in EnabledChild._meta.local_fields]
            assert not [error for error in DisabledMultiTableChild.check() if error.id == "models.E006"]
            assert not [error for error in RelabelledChild.check() if error.id == "models.E006"]
            assert not [error for error in EnabledChild.check() if error.id == "models.E006"]


class TestChecks:
    def test_the_installed_project_has_no_policy_errors(self):
        assert check_model_feature_policy(app_configs=None) == []

    def test_an_unknown_section_is_reported(self):
        with isolate_apps("tests.features"):

            class UnknownSectionModel(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Telemetry:
                        enabled = True

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(UnknownSectionModel)

        assert [error.id for error in errors] == ["vueda_core.E010"]
        assert "unknown feature section 'Telemetry'" in errors[0].msg

    def test_a_known_section_reports_its_absent_app(self, without_workflow_section):
        with isolate_apps("tests.features"):

            class AbsentAppModel(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Workflow:
                        enabled = True

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(AbsentAppModel)

        assert [error.id for error in errors] == ["vueda_core.E011"]
        assert "'vueda.workflow' is not installed" in errors[0].msg
        assert "INSTALLED_APPS" in errors[0].hint

    def test_an_unknown_option_is_reported(self):
        with isolate_apps("tests.features"):

            class UnknownOptionModel(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Probe:
                        enabled = True
                        nickname = "nope"

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(UnknownOptionModel)

        assert [error.id for error in errors] == ["vueda_core.E012"]
        assert "unknown option 'nickname'" in errors[0].msg

    def test_an_invalid_value_type_is_reported(self):
        with isolate_apps("tests.features"):

            class BadTypeModel(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Probe:
                        enabled = "yes"

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(BadTypeModel)

            with pytest.raises(FieldDoesNotExist):
                BadTypeModel._meta.get_field("probe_note")

        assert [error.id for error in errors] == ["vueda_core.E013"]
        assert errors[0].hint == "This option accepts: bool."

    def test_an_option_validator_is_reported(self):
        with isolate_apps("tests.features"):

            class BadTagsModel(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Probe:
                        enabled = True
                        tags = ("ok", 3)

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(BadTagsModel)

        assert [error.id for error in errors] == ["vueda_core.E013"]
        assert "Every tag must be a string" in errors[0].hint

    def test_an_invalid_child_value_is_rejected_before_a_merge_function_runs(self):
        with isolate_apps("tests.features"):

            class MergeBase(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Probe:
                        tags = ("base",)

                class Meta:
                    abstract = True
                    app_label = "features"

            class InvalidMergedValue(MergeBase):
                class Vueda:
                    class Probe:
                        tags = 3

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(InvalidMergedValue)

        assert [error.id for error in errors] == ["vueda_core.E013"]
        assert errors[0].hint == "This option accepts: list, tuple."

    def test_a_section_validator_is_reported(self):
        with isolate_apps("tests.features"):

            class LabelWithoutProbeModel(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Probe:
                        label = "orphaned"

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(LabelWithoutProbeModel)

        assert [error.id for error in errors] == ["vueda_core.E013"]
        assert "sets a label while the Probe section is disabled" in errors[0].hint

    def test_an_option_outside_a_section_is_reported(self):
        with isolate_apps("tests.features"):

            class LooseOptionModel(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    enabled = True

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(LooseOptionModel)

        assert [error.id for error in errors] == ["vueda_core.E015"]
        assert "outside of a feature section" in errors[0].msg

    def test_a_declaration_on_a_non_vueda_model_is_reported(self):
        with isolate_apps("tests.features"):

            class OutsiderModel(models.Model):
                class Vueda:
                    class Probe:
                        enabled = True

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(OutsiderModel)

        assert errors == [
            Error(
                "OutsiderModel declares class Vueda but is not a VUEDA model.",
                hint=(
                    "VUEDA reads feature policy from models built on a VUEDA base such as VuedaModel or "
                    "Lookup. Subclass one of those, or remove the declaration."
                ),
                obj=OutsiderModel,
                id="vueda_core.E016",
            )
        ]

    def test_a_lookup_model_is_checked_like_any_other(self):
        with isolate_apps("tests.features"):

            class BadLookup(Lookup):
                class Vueda:
                    class Probe:
                        enabled = "yes"

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(BadLookup)

        assert [error.id for error in errors] == ["vueda_core.E013"]


class TestFeatureRegistry:
    def test_a_second_app_cannot_claim_a_registered_section(self):
        with pytest.raises(ImproperlyConfigured, match="already registered by app 'features'"):
            register_feature_section(
                FeatureSection(
                    name="Probe",
                    app_label="somewhere_else",
                    options={"enabled": FeatureOption(default=False, types=(bool,))},
                )
            )

    def test_the_owning_app_may_re_register_its_own_section(self):
        from tests.features.apps import PROBE_SECTION

        assert register_feature_section(PROBE_SECTION) is PROBE_SECTION
        assert get_feature_sections()["Probe"] is PROBE_SECTION


class TestHistoryPolicyValidation:
    """A history policy that pghistory cannot honour must fail before it reaches registration."""

    def test_a_composite_primary_key_is_reported_rather_than_raised(self):
        """pghistory raises during model construction, which is too early for a system check to run."""
        from tests.store.models import OrderItemCompositePK
        from vueda.core.options import SectionOptions
        from vueda.history.apps import HISTORY_SECTION

        enabled = SectionOptions(HISTORY_SECTION, {"enabled": True, "exclude_fields": ()}, declared=["enabled"])
        messages = HISTORY_SECTION.validate(OrderItemCompositePK, enabled)

        assert len(messages) == 1
        assert "composite primary key" in messages[0]

    def test_an_opted_out_composite_primary_key_passes(self):
        from tests.store.models import OrderItemCompositePK

        assert check_model_feature_declaration(OrderItemCompositePK) == []
        assert get_vueda_options(OrderItemCompositePK)["History"]["enabled"] is False

    def test_excluding_an_unknown_field_is_reported(self):
        with isolate_apps("tests.features"):

            class ExcludesNothing(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class History:
                        exclude_fields = ("nope",)

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(ExcludesNothing)

        assert [error.id for error in errors] == ["vueda_core.E013"]
        assert "does not have: ['nope']" in errors[0].hint

    def test_excluding_a_field_a_generated_field_reads_is_reported(self):
        """formatted_name is generated from name, so dropping name would leave its expression short."""
        with isolate_apps("tests.features"):

            class ExcludesAGeneratedSource(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class History:
                        exclude_fields = ("name",)

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(ExcludesAGeneratedSource)

        assert [error.id for error in errors] == ["vueda_core.E013"]
        assert "formatted_name is a generated field reading ['name']" in errors[0].hint

    def test_a_field_another_feature_contributes_is_tracked(self):
        """History runs last, so an event model carries the fields earlier contributors added."""
        tracked = [field.name for field in feature_models.ProbeTracked._meta.concrete_fields]
        event_model = apps.get_model("features", "ProbeTrackedEvent")
        event_fields = [field.name for field in event_model._meta.concrete_fields]

        assert "probe_note" in tracked
        assert "probe_note" in event_fields

    def test_an_undeclared_history_default_makes_no_claim(self):
        assert get_vueda_options(feature_models.PlainProbe)["History"]["enabled"] is True
        assert check_model_feature_declaration(feature_models.PlainProbe) == []


class TestTransitionalFeatureValidators:
    """Workflow integration still follows inheritance, so an explicit choice must match it.

    This validator, and the mixin it names, goes away once workflow derives from this policy.
    """

    def test_workflow_opt_in_without_the_workflow_mixin_is_reported(self):
        with isolate_apps("tests.features"):

            class ClaimsWorkflow(VuedaModel):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Workflow:
                        enabled = True

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(ClaimsWorkflow)

        assert [error.id for error in errors] == ["vueda_core.E013"]
        assert "does not subclass HasWorkflowModelMixin" in errors[0].hint

    def test_workflow_opt_out_on_a_workflow_model_is_reported(self):
        from vueda.workflow.models import HasWorkflowModelMixin

        with isolate_apps("tests.features"):

            class DisclaimsWorkflow(VuedaModel, HasWorkflowModelMixin):
                name = models.CharField(max_length=255)

                class Vueda:
                    class Workflow:
                        enabled = False

                class Meta:
                    app_label = "features"

            errors = check_model_feature_declaration(DisclaimsWorkflow)

        assert [error.id for error in errors] == ["vueda_core.E013"]
        assert "subclasses HasWorkflowModelMixin" in errors[0].hint


class TestAppBoundary:
    def test_core_policy_modules_do_not_import_a_feature_app(self):
        """Core must not reach into an optional feature app to resolve or check a declaration."""
        import ast
        import pathlib

        import vueda.core

        core_directory = pathlib.Path(vueda.core.__file__).parent
        offenders = []

        for module_name in ("features.py", "options.py", "checks.py", "models.py"):
            tree = ast.parse((core_directory / module_name).read_text())
            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom):
                    imported = node.module or ""
                elif isinstance(node, ast.Import):
                    imported = " ".join(alias.name for alias in node.names)
                else:
                    continue

                if "vueda.history" in imported or "vueda.workflow" in imported:
                    offenders.append(f"{module_name}: {imported}")

        assert offenders == []

    def test_core_names_first_party_sections_without_their_defaults(self):
        """Core knows a first-party section's owning app, so it can report an absent one, and nothing more."""
        from vueda.core.features import FIRST_PARTY_SECTION_APPS

        assert FIRST_PARTY_SECTION_APPS == {"History": "vueda.history", "Workflow": "vueda.workflow"}
