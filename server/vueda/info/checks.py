from django.core.checks import Error


def _is_property_on_model(model, attr_name):
    """Return True if attr_name is defined as a @property anywhere in the model's MRO."""
    for klass in model.__mro__:
        if attr_name in klass.__dict__:
            return isinstance(klass.__dict__[attr_name], property)
    return False


def check_formatted_name_configuration(app_configs, **kwargs):
    from vueda.info.registration import get_all_registrations

    errors = []
    for _key, registration in get_all_registrations().items():
        serializer_class = registration["serializer"]
        model = serializer_class.Meta.model

        # Only check models that explicitly override formatted_name with None, signalling
        # the developer opted out of the default GeneratedField and must provide an alternative.
        if "formatted_name" not in model.__dict__ or model.__dict__["formatted_name"] is not None:
            continue

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
        elif has_lookup and not isinstance(has_lookup, str):
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
