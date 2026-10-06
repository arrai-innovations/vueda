- **Default ordering on a queryset annotation (`model_ordering`)**:
    - A default ordering term that names an annotation on the viewset's queryset is now reported in `default` under the annotation's name, and the annotation appears in `fields` with `ascending` and a `type` taken from its output field. Annotations that a model's manager adds are included. `default` used to come back empty for such an ordering.
      _A `GeneratedField`, database view, or `ordering_fields` entry that was added only to get such a default reported can be removed._
