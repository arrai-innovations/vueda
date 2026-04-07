---
title: Build Auth Views
status: draft
audience: implementor
type: how-to
---

# Build Auth Views

This guide covers building sign-in, sign-up, re-authentication, and two-factor authentication views using VUEDA's `AuthorizingForm` component, the field/widget system, and the user store. It walks through the component hierarchy, the redirect chain, form value handling, MFA flow integration, and common variant patterns.

The guide assumes familiarity with Vue component composition and VUEDA's field/widget architecture. For the field/widget composable surface, see [Custom Field/Widget Rendering](../guides/custom-field-widget-rendering). For client plugin registration (PrimeVue, ToastService, and related dependencies), see [Client Plugin Prerequisites](../guides/client-plugin-prerequisites).
For the core auth form component contract, review {@api vue:component:AuthorizingForm}. Auth redirects and action gates in this guide map closely to {@term Transition} behavior.

## Goal and Preconditions

The objective is a set of authentication views where:

- Sign-in collects credentials through `FormField`/`WidgetInput` and submits them through the user store's `login` action.
- `AuthorizingForm` watches the user store for login state changes and redirects automatically on success.
- MFA flows are detected from the server response and route the user to a two-factor authentication view.
- Re-authentication views enforce a `recentlyLoggedIn` check for sensitive operations.
- Server-side validation errors surface through the standard `ActionForm` error handling.

Before you begin:

The client application must have PrimeVue, ToastService, and the VUEDA {@term CRUDL} adapters registered. See [Client Plugin Prerequisites](../guides/client-plugin-prerequisites) for the full registration sequence.

The server must expose the authentication endpoints (`login`, `logout`, `who-is`, `2fa/authenticate`, `reauthenticate`). These are provided by `vueda.user` when it is included in `INSTALLED_APPS`.

## Component Hierarchy

Auth views are built from three layers:

**`AuthorizingForm`** wraps `ActionForm` and adds login-aware redirect logic. It watches `storeUser` for changes to `loggedIn`, `recentlyLoggedIn`, and `pendingFlow`, and routes the user on success or MFA detection.

**`ActionForm`** handles the submit lifecycle: validation, calling `runAction`, displaying toasts, and routing success/error responses.

**`FormField` / `WidgetInput`** provide the form inputs. In auth views, these are used in "hand-authored" mode (fields are declared in the template, not driven by model-info metadata).

The typical template structure is:

```vue
<AuthorizingForm :run-action="handleSubmit" :form-props="formProps">
    <template #action-form-inner>
        <FormField label="Email" name="email" required>
            <WidgetInput :required="true" type="text" autocomplete="username" />
        </FormField>
        <FormField label="Password" name="password" required>
            <WidgetInput :required="true" type="password" autocomplete="current-password" />
        </FormField>
    </template>
</AuthorizingForm>
```

`AuthorizingForm` passes `runAction` and `formProps` down to `ActionForm`. Field components register themselves with the form context through `useField`, and `ActionForm` collects their values at submit time.

## Build a Sign-In View

Define form initial values and a submit handler that calls the user store:

```vue
<script setup>
import AuthorizingForm from "@vueda/components/AuthorizingForm.vue";
import FormField from "@vueda/fields/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import WidgetInput from "@vueda/widgets/WidgetInput.vue";
import { reactive } from "vue";

const userStore = storeUser();
const formProps = reactive({
    initialValues: {
        email: "",
        password: "",
    },
});

const handleSubmit = ({ formValues }) => {
    return userStore.login(formValues);
};
</script>

<template>
    <AuthorizingForm header="Sign In" :run-action="handleSubmit" :form-props="formProps">
        <template #action-form-inner>
            <FormField label="Email" name="email" required>
                <WidgetInput :required="true" autocomplete="username" />
            </FormField>
            <FormField label="Password" name="password" required>
                <WidgetInput :required="true" type="password" autocomplete="current-password" />
            </FormField>
        </template>
    </AuthorizingForm>
</template>
```

The `handleSubmit` function receives `{ formValues }` from `ActionForm`'s submit cycle. `formValues` contains the current field values (keyed by `name`), excluding any fields marked as ignored. The function must return a promise; `ActionForm` uses the resolution or rejection to drive success/error toasts.

## Redirect Chain

After a successful login, `AuthorizingForm` evaluates redirect targets in priority order:

1. **MFA pending flow.** If `storeUser.pendingFlow` has `id === "mfa_authenticate"`, the component routes to the `2fa` named route immediately. No success toast is shown; the user must complete MFA first.

2. **Query parameter redirect.** If `route.query.redirect` is present, the component uses that path. This supports the pattern where a route guard redirects an unauthenticated user to sign-in with `?redirect=/original-path`.

3. **Prop redirect.** If the `redirect` prop is set on `AuthorizingForm`, the component uses that value. This is the static fallback for views that always redirect to a specific destination.

4. **Default.** If none of the above match, the component routes to `{ name: "welcome" }`.

On a successful redirect, `AuthorizingForm` shows a toast: "You are now signed in and have been redirected."

The `requireRecentLogin` prop adds an additional check: the redirect only fires when both `loggedIn` and `recentlyLoggedIn` are true. Use this prop for re-authentication views where a fresh login is required.

## MFA Flow Handling

When the server requires two-factor authentication, the login endpoint returns a `401` response with a `flows` array in the response body. The user store's error handler extracts the last flow from the array and sets it as `pendingFlow`.

`AuthorizingForm` watches `pendingFlow`. When it detects a flow with `id === "mfa_authenticate"`, it routes to the `2fa` named route. The login state remains `loggedIn: false` until MFA completes.

Build a two-factor authentication view following the same pattern, but calling `userStore.twoFactorAuthenticate` instead of `login`:

```vue
<script setup>
import AuthorizingForm from "@vueda/components/AuthorizingForm.vue";
import FormField from "@vueda/fields/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import WidgetInput from "@vueda/widgets/WidgetInput.vue";
import { reactive } from "vue";

const userStore = storeUser();
const formProps = reactive({
    initialValues: {
        code: "",
    },
});

const handleSubmit = ({ formValues }) => {
    return userStore.twoFactorAuthenticate({
        code: formValues.code,
    });
};
</script>

<template>
    <AuthorizingForm
        header="Two-Factor Authentication"
        sub-title="Enter the code from your authenticator app."
        :run-action="handleSubmit"
        :form-props="formProps"
    >
        <template #action-form-inner>
            <FormField label="Code" name="code" required>
                <WidgetInput :required="true" type="otp" autocomplete="one-time-code" />
            </FormField>
        </template>
    </AuthorizingForm>
</template>
```

On success, `twoFactorAuthenticate` clears `pendingFlow` and sets `loggedIn: true`. `AuthorizingForm` then evaluates the redirect chain as normal.

## Build a Re-Authentication View

Some operations require proof that the user logged in recently (not just that they have an active session). Build a re-authentication view with `requireRecentLogin: true`:

```vue
<script setup>
import AuthorizingForm from "@vueda/components/AuthorizingForm.vue";
import FormField from "@vueda/fields/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import WidgetInput from "@vueda/widgets/WidgetInput.vue";
import { reactive } from "vue";

const userStore = storeUser();
const formProps = reactive({
    initialValues: {
        password: "",
    },
});

const handleSubmit = ({ formValues }) => {
    return userStore.reauthenticate(formValues);
};
</script>

<template>
    <AuthorizingForm
        header="Confirm Your Identity"
        :run-action="handleSubmit"
        :form-props="formProps"
        :require-recent-login="true"
    >
        <template #action-form-inner>
            <FormField label="Password" name="password" required>
                <WidgetInput :required="true" type="password" autocomplete="current-password" />
            </FormField>
        </template>
    </AuthorizingForm>
</template>
```

The `requireRecentLogin` prop tells `AuthorizingForm` to wait for `recentlyLoggedIn` (not just `loggedIn`) before triggering the redirect. The server sets this flag when the login or reauthentication occurred within a recent window.

## Build a Change-Password View

Change-password is another hand-authored form variant. It uses `AuthForm` (a simpler wrapper than `AuthorizingForm` that does not watch login state or redirect):

```vue
<script setup>
import AuthForm from "@vueda/components/AuthForm.vue";
import FormField from "@vueda/fields/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import WidgetInput from "@vueda/widgets/WidgetInput.vue";
import { reactive } from "vue";

const userStore = storeUser();
const formProps = reactive({
    initialValues: {
        old_password: "",
        new_password1: "",
        new_password2: "",
    },
});

const handleSubmit = ({ formValues }) => {
    return userStore.changePassword({
        old_password: formValues.old_password,
        new_password1: formValues.new_password1,
        new_password2: formValues.new_password2,
    });
};
</script>

<template>
    <AuthForm header="Change Password" :run-action="handleSubmit" :form-props="formProps">
        <template #action-form-inner>
            <FormField label="Current Password" name="old_password" required>
                <WidgetInput :required="true" type="password" />
            </FormField>
            <FormField label="New Password" name="new_password1" required>
                <WidgetInput :required="true" type="password" />
            </FormField>
            <FormField label="Confirm New Password" name="new_password2" required>
                <WidgetInput :required="true" type="password" />
            </FormField>
        </template>
    </AuthForm>
</template>
```

`AuthForm` and `AuthorizingForm` share the same layout and slot structure. The difference is that `AuthForm` does not watch login state and does not redirect. Use `AuthForm` for authenticated operations that stay on the current page after success.

## Hand-Authored Form Patterns

Auth views use `FormField` and `WidgetInput` outside the metadata-driven CRUDL surface. In CRUDL views, field components are rendered automatically from model-info metadata. In auth views, you declare fields manually in the template.

The key differences from CRUDL forms:

- **`formProps.initialValues`** must be defined explicitly. CRUDL forms populate initial values from a server-retrieved object; auth forms set them to empty strings or defaults.
- **Field `name` props** must match the keys the server endpoint expects. There is no model-info metadata to enforce naming.
- **No `formModelName` prop.** Auth forms do not reference a model config, so config-driven field behaviour (read-only states, visibility rules) does not apply.
- **`WidgetInput` type variants** are set directly. Use `type="password"` for password fields, `type="otp"` for one-time codes. The full set of supported types is: `text`, `password`, `number`, `otp`, and `mask`.

Validation in hand-authored forms uses the same `FormField` props as CRUDL forms: `required`, `maxLength`, `minLength`, and `patternRegex` (available when `validation="text"` is set). Server-side validation errors are mapped by field name; if the server returns `{ "email": ["This field is required."] }`, the error surfaces on the `FormField` with `name="email"`.

## Verification Checklist

After building auth views, verify the following:

- Submitting valid credentials logs the user in and triggers a redirect.
- Submitting invalid credentials displays a server-provided error message on the form.
- Navigating to a protected route while unauthenticated redirects to sign-in with `?redirect=/original-path`, and successful login returns to the original path.
- When MFA is required, the sign-in form routes to the 2FA view instead of completing the redirect.
- Completing 2FA clears `pendingFlow` and triggers the normal redirect chain.
- The re-authentication view only redirects when `recentlyLoggedIn` is true.
- The change-password view displays per-field validation errors from the server (e.g., "This password is too common.").

## Troubleshooting

**Sign-in succeeds but no redirect occurs.** Check that the view uses `AuthorizingForm`, not `AuthForm`. `AuthForm` does not watch login state. Also verify that the router has a route named `welcome` (the default redirect target) or that the `redirect` prop is set.

**MFA flow is not detected after login.** The server must return a `401` with a `flows` array. If the response lacks `flows`, `pendingFlow` will not be set. Inspect the raw API response. Also verify that the router has a route named `2fa`.

**Form values are not sent to the server.** Verify that field `name` props match the keys the server expects. `ActionForm` reads values from `formContext.state.submittingValues`, which uses the field `name` as the key.

**Toast shows "You are now signed in" but the page does not navigate.** The redirect target route may not exist. Check the router configuration for the target named route. If using `route.query.redirect`, verify the path matches an existing route.

**Re-authentication redirect fires immediately.** If the user already has a recent login, `recentlyLoggedIn` is already true and the watcher fires on mount. This is expected; the user does not need to re-authenticate if the server considers their session recent.

## Relevant Implementation Surface

- Vue.js Components:
    - {@api vue:component:AuthorizingForm}
    - {@api vue:component:AuthForm}
    - {@api vue:component:ActionForm}
    - {@api vue:component:FormField}
    - {@api vue:component:WidgetTextInput}
- JavaScript:
    - {@api js:module:@arrai-innovations/vueda/stores/storeUser}
    - {@api js:module:@arrai-innovations/vueda/use/useField}
    - {@api js:module:@arrai-innovations/vueda/use/useWidget}
    - {@api js:module:@arrai-innovations/vueda/use/useForm}
- REST:
    - {@api rest:endpoint:POST:/vueda.user/login/}
    - {@api rest:endpoint:POST:/vueda.user/logout/}
    - {@api rest:endpoint:GET:/vueda.user/who-is/}
    - {@api rest:endpoint:POST:/vueda.user/2fa/authenticate/}
    - {@api rest:endpoint:POST:/vueda.user/reauthenticate/}
    - {@api rest:endpoint:POST:/vueda.user/change_password/}
