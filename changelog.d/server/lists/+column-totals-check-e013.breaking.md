- **The `column_totals` system check is `vueda_info.E013`**:
    - A misconfigured `column_totals` declaration now reports `vueda_info.E013`. It shared `vueda_info.E011` with the `formatted_name_lookup_expression` and `formatted_name_select_related` check, so a project could not silence or search for one without the other. `vueda_info.E011` now means only the `formatted_name` check.
      _Replace `vueda_info.E011` with `vueda_info.E013` in `SILENCED_SYSTEM_CHECKS` or anywhere else you match the column-totals check by id._
