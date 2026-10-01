- **`FRONTEND_DOMAIN`**:
    - Welcome and password reset emails now read `FRONTEND_DOMAIN` as a full origin, such as `https://app.example.com`, as the project templates set it. They had put `https://` in front of the value, so a template-generated project emailed links that began `https://https://`.
      _If your project sets `FRONTEND_DOMAIN` without a scheme, add one._
