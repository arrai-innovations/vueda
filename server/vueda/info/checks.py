from django.core.checks import Error
from django.core.checks import Warning as CheckWarning


def _is_property_on_model(model, attr_name):
    """Return True if attr_name is defined as a @property anywhere in the model's MRO."""
    for klass in model.__mro__:
        if attr_name in klass.__dict__:
            return isinstance(klass.__dict__[attr_name], property)
    return False


def _validate_model_formatted_name(model):
    from vueda.core.models import FormattedNameBaseModel

    errors = []
    # Only validate models that inherit FormattedNameBaseModel.
    if not issubclass(model, FormattedNameBaseModel):
        return errors

    # Only check models that explicitly override formatted_name with None, signalling
    # the developer opted out of the default GeneratedField and must provide an alternative.
    if "formatted_name" not in model.__dict__ or model.__dict__["formatted_name"] is not None:
        return errors

    has_lookup = getattr(model, "formatted_name_lookup_expression", None)
    # callable() returns False for @property, so check that separately for a targeted error.
    has_method = callable(getattr(model, "get_formatted_name", None))
    has_property = _is_property_on_model(model, "get_formatted_name")

    if has_property:
        errors.append(
            Error(
                f"{model.__name__}.get_formatted_name is decorated with @property.",
                hint="Remove the @property decorator; get_formatted_name() must be a plain method.",
                obj=model,
                id="vueda_info.E003",
            )
        )
    elif has_lookup is not None and not isinstance(has_lookup, str):
        errors.append(
            Error(
                f"{model.__name__} defines formatted_name_lookup_expression as something other than a string.",
                hint=("formatted_name_lookup_expression is used by DB field lookups, so it must be a string."),
                obj=model,
                id="vueda_info.E004",
            )
        )
    elif has_lookup and has_method:
        errors.append(
            Error(
                f"{model.__name__} defines both formatted_name_lookup_expression and get_formatted_name().",
                hint=(
                    "Use formatted_name_lookup_expression for DB field lookups, "
                    "or get_formatted_name() for computed values — not both."
                ),
                obj=model,
                id="vueda_info.E002",
            )
        )
    elif not has_lookup and not has_method:
        errors.append(
            Error(
                f"{model.__name__} sets formatted_name = None but provides no alternative.",
                hint=(
                    "Set formatted_name_lookup_expression to a DB field name, "
                    "or define get_formatted_name() on the model."
                ),
                obj=model,
                id="vueda_info.E001",
            )
        )

    return errors


def check_formatted_name_configuration(app_configs, **kwargs):
    from vueda.info.registration import get_all_registrations

    errors = []
    checked_models = set()

    for _key, registration in get_all_registrations().items():
        serializer_class = registration["serializer"]
        model = serializer_class.Meta.model
        if model not in checked_models:
            checked_models.add(model)
            errors.extend(_validate_model_formatted_name(model))

        # Also validate models referenced in expandable_fields so misconfigured
        # related models are caught even if they are not directly registered.
        expandable = getattr(getattr(serializer_class, "Meta", None), "expandable_fields", {})
        for _field_name, field_data in expandable.items():
            child_serializer_class = field_data[0] if isinstance(field_data, tuple) else field_data
            if isinstance(child_serializer_class, str):
                continue  # lazy-loaded; cannot resolve at check time
            child_model = getattr(getattr(child_serializer_class, "Meta", None), "model", None)
            if child_model and child_model not in checked_models:
                checked_models.add(child_model)
                errors.extend(_validate_model_formatted_name(child_model))

    return errors


class _CheckContextView:
    """Minimal stand-in for a DRF view, so a canonical serializer that reads
    ``self.context["view"]`` while building its fields (for example ``ExcludeFieldsSerializerMixin``,
    which reads ``.action`` from it) can still be introspected outside of any request. This check
    runs through ``manage.py check``, not a request, so there is no real view to supply here;
    ``action = None`` matches none of the actions such a mixin special-cases, which is the least
    surprising default -- no field gets excluded that a plain "list"/"retrieve" response wouldn't
    also include.
    """

    action = None


def _get_field_model_info_corrected_fields(serializer_class, serializer_instance):
    """
    Build the model_fields metadata dict a real /info/ request would see for this serializer,
    including whatever get_field_model_info corrects -- so the check can tell a field the
    developer has already described (its real type_db/type_model filled in) from one that is
    still genuinely unresolved. Never raises: this feeds an advisory check, so a serializer this
    cannot safely introspect just yields no corrections rather than blocking manage.py check.
    """
    from vueda.info.serializers import ModelInfoSerializer

    try:
        fields = ModelInfoSerializer().get_model_fields_data(serializer_class, context={"view": _CheckContextView()})
        get_field_model_info = getattr(serializer_instance, "get_field_model_info", None)
        if get_field_model_info is not None:
            fields = get_field_model_info(fields)
        return fields
    except Exception:
        return {}


def _validate_field_source_resolution(serializer_class, model):
    from vueda.info.field_resolution import resolve_serializer_field_model_field

    warnings = []
    try:
        serializer_instance = serializer_class(context={"view": _CheckContextView()})
        fields = serializer_instance.get_fields()
    except Exception:
        # Advisory only: a canonical serializer this check cannot safely introspect outside a
        # request must not prevent manage.py check, or any other command, from completing.
        return warnings

    corrected_fields = None

    for field_name, field in fields.items():
        _model_field, unresolved_path = resolve_serializer_field_model_field(model, field_name, field)
        if unresolved_path is None:
            continue

        # A lookup_expression is fed straight to models.F() for queryset annotation and to Django
        # admin's lookup_field(); neither can reach a @property or method, so it has no legitimate
        # non-model-backed reading the way a field's source= does -- get_field_model_info only
        # corrects the metadata dict, it cannot fix what those runtime consumers will also break.
        is_lookup_expression = isinstance(getattr(model, f"{field_name}_lookup_expression", None), str)

        if not is_lookup_expression:
            if corrected_fields is None:
                corrected_fields = _get_field_model_info_corrected_fields(serializer_class, serializer_instance)
            corrected = corrected_fields.get(field_name) or {}
            if corrected.get("type_db") is not None or corrected.get("type_model") is not None:
                continue

        if is_lookup_expression:
            hint = (
                f"'{unresolved_path}' did not resolve to a model field. formatted_name_lookup_expression is "
                "used for queryset annotation and Django admin field lookups, both DB-level operations, so it "
                "must name a real field path. Fix the model's lookup expression."
            )
        else:
            hint = (
                f"'{unresolved_path}' did not resolve to a model field. If {field_name} is genuinely not "
                "model-backed, override get_field_model_info to correct its model_fields metadata. "
                "Otherwise, fix the field's source=."
            )

        warnings.append(
            CheckWarning(
                f"{serializer_class.__name__}.{field_name} does not resolve to a field on {model.__name__}.",
                hint=hint,
                obj=serializer_class,
                id="vueda_info.W001",
            )
        )
    return warnings


def check_field_source_resolution(app_configs, **kwargs):
    from vueda.info.registration import get_all_registrations

    warnings = []
    checked = set()

    for _key, registration in get_all_registrations().items():
        serializer_class = registration["serializer"]
        model = serializer_class.Meta.model
        if serializer_class not in checked:
            checked.add(serializer_class)
            warnings.extend(_validate_field_source_resolution(serializer_class, model))

    return warnings
