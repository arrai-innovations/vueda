- **Error responses roll back the request's writes (`debug_stack_exception_handler`)**:
    - With `ATOMIC_REQUESTS`, a view that wrote rows and then raised an exception DRF does not handle (a 500) or withheld the request through `gate_warnings` (a 409) committed those writes. The exception handler now marks the request's transaction for rollback for every response it builds. Built-in create, update, and destroy were not affected.
      _If a custom view relies on a write surviving its own error response, make that write outside the request transaction._
