- **Invalid password reset link errors (`storeUser.checkResetLinkIsValid`)**:
    - A 400 response built `InvalidResetPasswordLinkError` with its arguments shifted, so its message read "[object Response]", `response` held the response body, and `responseData` was empty. The error now carries the message "Invalid password reset link", the response, and the body in `responseData`.
      _If code reads the body from this error's `response`, read `responseData` instead._
