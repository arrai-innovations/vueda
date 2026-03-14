"""Django form fields for content type lookups and array value validation."""

__all__ = (
    "BaseArrayField",
    "ContentTypeModelChoiceField",
)

from django import forms

from vueda.core.exceptions import VuedaValidationError
from vueda.core.widgets import BaseArrayWidget


class ContentTypeModelChoiceField(forms.ModelChoiceField):
    def label_from_instance(self, obj):
        """
        Convert objects into strings and generate the labels for the choices
        presented by this object. Subclasses can override this method to
        customize the display of the choices.
        """
        model = obj.model_class()
        if not model:
            return obj.model
        return f"{model._meta.app_config.name} | {model._meta.verbose_name}"


class BaseArrayField(forms.Field):
    """
    Base field for validating native arrays. Value validation is performed by
    secondary base classes.

    This is related to JSON DRF handling allowing for native arrays to be
    validated and serialized.

    ex::
        class IntegerArrayField(BaseArrayField, filters.IntegerField):
            pass

    """

    base_widget_class = BaseArrayWidget

    def __init__(self, *args, **kwargs):
        widget = kwargs.get("widget") or self.widget
        kwargs["widget"] = self._get_widget_class(widget)

        super().__init__(*args, **kwargs)

    def _get_widget_class(self, widget):
        # passthrough, allows for override
        if isinstance(widget, BaseArrayWidget) or (isinstance(widget, type) and issubclass(widget, BaseArrayWidget)):
            return widget

        # complain since we are unable to reconstruct widget instances
        assert isinstance(widget, type), f"'{self.__class__.__name__}.widget' must be a widget class, not {widget!r}."

        bases = (
            self.base_widget_class,
            widget,
        )
        return type(str(f"Array{widget.__name__}"), bases, {})

    def clean(self, value):
        if value in self.empty_values and self.required:
            raise VuedaValidationError(self.error_messages["required"], code="required")

        if value is None:
            return None
        return [super(BaseArrayField, self).clean(v) for v in value]
