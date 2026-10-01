- **`NO_REPLY_EMAIL`**:
    - `get_defaults` now reads `NO_REPLY_EMAIL` as a required key, like `SUPPORT_EMAIL`. The user app sends password reset, welcome, and two-factor code email from it, and a project without it failed when the first of those was sent.
      _Add `NO_REPLY_EMAIL` to your project's configuration, for example `NO_REPLY_EMAIL = "no-reply@example.com"` in `config.toml`._
