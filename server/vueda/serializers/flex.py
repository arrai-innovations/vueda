from rest_framework.exceptions import ValidationError


class NoExtraFieldsSerializerMixin:
    """
    Explode on extra fields, but it is not the default behavior of DRF.

    This lets us clean up client code or tests with extraneous keys.
    """

    def validate(self, attrs):
        attrs = super().validate(attrs)
        errors = {}
        if hasattr(self, "initial_data"):
            extra_keys = set(self.initial_data.keys()) - set(self.fields.keys())
            if hasattr(self, "_flex_options_rep_only"):
                extra_keys -= set(self._flex_options_rep_only["fields"])
                extra_keys -= set(self._flex_options_rep_only["expand"])
            for extra_key in extra_keys:
                if extra_key in errors:
                    errors[extra_key].append("Unexpected field.")
                else:
                    errors[extra_key] = ["Unexpected field."]
        if errors:
            raise ValidationError(errors)
        return attrs
