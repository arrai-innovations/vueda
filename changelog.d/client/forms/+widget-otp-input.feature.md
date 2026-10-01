- **`WidgetOTPInput`**:
    - A one-time code widget that binds an `InputOTP` to its `FormField`, so the typed code becomes the field value. `ViewTwoFactorAuth` and `ViewSetupDevice` use it; with a bare `InputOTP` their code field never received the typed value.
      _Replace a bare `InputOTP` inside a `FormField` in custom auth views with `WidgetOTPInput`._
