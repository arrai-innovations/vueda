- **`Progress`**:
    - A `Progress` without a `model-value`, or with `null`, is indeterminate and animates. Before, `model-value` defaulted to `0`, so the bar never reached the indeterminate state, and omitting `max` rendered a full static bar. The fill now scales by `max`, which defaults to 100.
      _For an indeterminate bar, omit `model-value` or pass `null`; omitting `max` alone no longer does it._
