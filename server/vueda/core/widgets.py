from copy import deepcopy
from typing import Iterable

from django import forms
from django.utils.encoding import force_str


class BaseArrayWidget(forms.Widget):
    """
    Copied from django's BaseCSVWidget.
    For our use parsing json and querystrings, which can pass arrays natively.

    The surrogate probably doesn't make sense for our use case, but it's here.
    """

    # Surrogate widget for rendering multiple values
    surrogate = forms.TextInput

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if isinstance(self.surrogate, type):
            self.surrogate = self.surrogate()
        else:
            self.surrogate = deepcopy(self.surrogate)

    def _isiterable(self, value):
        return isinstance(value, Iterable) and not isinstance(value, str)

    def value_from_datadict(self, data, files, name):
        if hasattr(data, "getlist"):
            value = data.getlist(name, None)
        else:
            value = super().value_from_datadict(data, files, name)

        if value is not None:
            if len(value) == 1 and "," in value[0]:
                value = value[0].split(",")
            if value == "":  # empty value should parse as an empty list
                return []
            if isinstance(value, str):
                return [value]
            return value
        return None

    def render(self, name, value, attrs=None, renderer=None):
        if not self._isiterable(value):
            value = [value]

        if len(value) <= 1:
            # delegate to main widget (Select, etc...) if not multiple values
            value = value[0] if value else ""
            return super().render(name, value, attrs, renderer=renderer)

        # if we have multiple values, we need to force render as a text input
        # (otherwise, the additional values are lost)
        value = [force_str(self.surrogate.format_value(v)) for v in value]
        value = ",".join(list(value))

        return self.surrogate.render(name, value, attrs, renderer=renderer)
