"""Serializer validators that return conflicting object details."""

__all__ = ("UniqueTogetherWithPkValidator",)

from rest_framework.validators import UniqueTogetherValidator

from vueda.core.exceptions import VuedaValidationError


class UniqueTogetherWithPkValidator(UniqueTogetherValidator):
    """
    A validator like UniqueTogetherValidator, but returns the pk of the conflicting object
    in the ValidationError.
    """

    def __call__(self, attrs, serializer):
        queryset = self.queryset
        filter_kwargs = {field_name: attrs[field_name] for field_name in self.fields}

        instance = getattr(serializer, "instance", None)
        conflicting_obj = queryset.filter(**filter_kwargs).first()

        if conflicting_obj and (instance is None or conflicting_obj.pk != instance.pk):
            raise VuedaValidationError(
                {
                    "non_field_errors": [
                        {
                            "detail": self.message,
                            "conflicting_pk": conflicting_obj.pk,
                        }
                    ]
                }
            )
