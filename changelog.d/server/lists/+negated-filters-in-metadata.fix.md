- **Model metadata reports negated filters (`model_filtering`)**:
    - `model_filtering` left out any filter declared with django-filter's `exclude=True`, although the list endpoint accepted it. It now reports such a filter like any other, with a label such as "Exclude Name", so the client's filter menu offers it. Only a filter with a disabled form field stays out.
      _To keep a negated filter out of the filter menu, give it a hidden widget or leave it out of the model config's `filterables`._
