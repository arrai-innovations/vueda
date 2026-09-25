- **List requests reject dotted expands the permit list does not name (`permit_list_expands`)**:
    - drf-flex-fields keeps a list expand only when `permit_list_expands` names it as written, so `?e=customer.user` with `permit_list_expands = ["customer"]` returned 200 with `customer` not expanded at all. That request now returns the usual "Invalid expands" 400. A dotted entry such as `"customer.user"` in the permit list permits that path.
      _Add each dotted list expand your client requests to the viewset's `permit_list_expands`, or stop requesting it._
