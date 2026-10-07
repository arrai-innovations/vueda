---
title: Build Auth Views
status: draft
audience: integrator
type: how-to
---

# Build Auth Views

This guide covers building sign-in, sign-up, re-authentication, and two-factor authentication views using VUEDA's `AuthorizingForm` component, the field/widget system, and the user store. It walks through the component hierarchy, the redirect chain, form value handling, MFA flow integration, and common variant patterns.

The guide assumes familiarity with Vue component composition and VUEDA's field/widget architecture. For the field/widget composable surface, see [Custom Field/Widget Rendering](../guides/custom-field-widget-rendering). For client plugin registration (theme, CRUDL adapters, and related dependencies), see [Client Plugin Prerequisites](../guides/client-plugin-prerequisites).
For the core auth form component contract, review {@api vue:component:AuthorizingForm}. Auth redirects and action gates in this guide map closely to {@term Transition} behavior.

## Goal and Preconditions

The objective is a set of authentication views where:

- Sign-in collects credentials through `FormField`/`WidgetTextInput` and submits them through the user store's `login` action.
- `AuthorizingForm` watches the user store for login state changes and redirects automatically on success.
- The who-is response names a pending MFA step, and the user is routed to a two-factor authentication view.
- Re-authentication views ask for confirmation before sensitive operations while `authPendingFlow` names a reauthentication flow, asking for a second-factor code or the password as the server requires.
- Server-side validation errors surface through the standard `ActionForm` error handling.

Before you begin:

The client application must have the VUEDA theme registered, a `<Sonner />` toaster mounted, and the VUEDA {@term CRUDL} adapters registered. See [Client Plugin Prerequisites](../guides/client-plugin-prerequisites) for the full registration sequence.

The server must expose the authentication endpoints (`login`, `logout`, `who-is`, `2fa/authenticate`, `reauthenticate`, `2fa/reauthenticate`). These are provided by `vueda.user` when it is included in `INSTALLED_APPS`.

## Component Hierarchy

Auth views are built from three layers:

**`AuthorizingForm`** wraps `ActionForm` and adds login-aware redirect logic. It watches `storeUser` for changes to `loggedIn` and `authPendingFlow`, and routes the user on success or MFA detection.

**`ActionForm`** handles the submit lifecycle: validation, calling `runAction`, displaying toasts, and routing success/error responses.

**`FormField` / `WidgetTextInput`** provide the form inputs. In auth views, these are used in "hand-authored" mode (fields are declared in the template, not driven by model-info metadata).

The typical template structure is:

```vue
<AuthorizingForm :run-action="handleSubmit" :form-props="formProps">
    <template #action-form-inner>
        <FormField label="Email" name="email" required>
            <WidgetTextInput :required="true" type="text" autocomplete="username" />
        </FormField>
        <FormField label="Password" name="password" required>
            <WidgetTextInput :required="true" type="password" autocomplete="current-password" />
        </FormField>
    </template>
</AuthorizingForm>
```

`AuthorizingForm` passes `runAction` and `formProps` down to `ActionForm`. Field components register themselves with the form context through `useField`, and `ActionForm` collects their values at submit time.

## Build a Sign-In View

Define form initial values and a submit handler that calls the user store:

```vue
<script setup>
import FormField from "@vueda/form/form-model/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import AuthorizingForm from "@vueda/views/AuthorizingForm.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
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
                <WidgetTextInput :required="true" autocomplete="username" />
            </FormField>
            <FormField label="Password" name="password" required>
                <WidgetTextInput :required="true" type="password" autocomplete="current-password" />
            </FormField>
        </template>
    </AuthorizingForm>
</template>
```

The `handleSubmit` function receives `{ formValues }` from `ActionForm`'s submit cycle. `formValues` contains the current field values (keyed by `name`), excluding any fields marked as ignored. The function must return a promise; `ActionForm` uses the resolution or rejection to drive success/error toasts.

## Redirect Chain

After a successful login, `AuthorizingForm` evaluates redirect targets in priority order:

1. **MFA pending flow.** If `storeUser.authPendingFlow` is `"mfa_authenticate"`, the component routes to the `2fa` named route immediately. No success toast is shown; the user must complete MFA first.

2. **Query parameter redirect.** If `route.query.redirect` is present, the component uses that path. This supports the pattern where a route guard redirects an unauthenticated user to sign-in with `?redirect=/original-path`.

3. **Prop redirect.** If the `redirect` prop is set on `AuthorizingForm`, the component uses that value. This is the static fallback for views that always redirect to a specific destination.

4. **Default.** If none of the above match, the component routes to `{ name: "welcome" }`.

On a successful redirect, `AuthorizingForm` shows a toast: "You are now signed in and have been redirected." When the redirect does not happen, it shows "Signed in, but could not open the next page" instead. The `toasts` prop replaces either message. Each entry takes a `title` and a `description`, and a field you leave out keeps its default:

```vue
<AuthorizingForm
    :run-action="handleSubmit"
    :toasts="{ success: { title: 'Welcome Back', description: 'Your dashboard is ready.' } }"
/>
```

The `requireRecentLogin` prop adds an additional check: the redirect only fires when `loggedIn` is true and `authPendingFlow` is empty. Use this prop for re-authentication views where a fresh login is required.

## MFA Flow Handling

When the server requires two-factor authentication, the login endpoint returns a `401` response. The user store's error handler refetches who-is. While that sign-in waits, the anonymous who-is response carries the stage as `auth_pending_flow`, and the store sets `authPendingFlow` from it. Because the stage lives in the server session, a page reload during the two-factor step resumes where it left off.

`AuthorizingForm` watches `authPendingFlow`. When it becomes `"mfa_authenticate"`, it routes to the `2fa` named route. The login state remains `loggedIn: false` until MFA completes.

Build a two-factor authentication view following the same pattern, but calling `userStore.twoFactorAuthenticate` instead of `login`:

```vue
<script setup>
import InputOTP from "@vueda/controls/input-otp/InputOTP.vue";
import InputOTPGroup from "@vueda/controls/input-otp/InputOTPGroup.vue";
import InputOTPSlot from "@vueda/controls/input-otp/InputOTPSlot.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import AuthorizingForm from "@vueda/views/AuthorizingForm.vue";
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
                <InputOTP :maxlength="6">
                    <InputOTPGroup>
                        <InputOTPSlot v-for="i in 6" :key="i" :index="i - 1" />
                    </InputOTPGroup>
                </InputOTP>
            </FormField>
        </template>
    </AuthorizingForm>
</template>
```

On success, `twoFactorAuthenticate` refetches who-is, which sets `loggedIn: true` and clears `authPendingFlow`. `AuthorizingForm` then evaluates the redirect chain as normal.

## Build a Re-Authentication View

Some operations require proof that the user authenticated recently (not just that they have an active session). The proof the server accepts depends on the account: a code from a user who has a two-factor device, the password otherwise. The who-is response names the flow the session owes as `auth_pending_flow`, and the user store copies it into `authPendingFlow`:

- `mfa_reauthenticate`: the user has a two-factor device, so they must confirm a code. Their password alone does not count. `userStore.twoFactorReauthenticate` completes it.
- `reauthenticate`: the user has only a password, so they confirm the password. `userStore.reauthenticate` completes it.
- `null`: the session is recent, or the user has neither a password nor a device, so nothing is pending.

`ViewReauthenticate` reads `authPendingFlow` and renders the matching form: `ViewTwoFactorAuth` for a code, with method selection, code sending, and recovery codes, or a single password field. Mount it at the route named `reauthenticate`, which `useAuthFlow` and the `requireRecentAuth` guard push to with the refused path in `?redirect`:

```js
{
    path: "/reauthenticate/",
    name: "reauthenticate",
    component: async () => (await import("@vueda/views/ViewReauthenticate.vue")).default,
    beforeEnter: (to) => requireAuth({ name: "sign-in" }, to, router, pinia),
}
```

Both forms pass `requireRecentLogin` to `AuthorizingForm`, which waits for `authPendingFlow` to clear (not just for `loggedIn`) before triggering the redirect. The server clears `auth_pending_flow` when the session completed the required flow, at login or by reauthenticating, within `ACCOUNT_REAUTHENTICATION_TIMEOUT`. A user who reaches the view with a recent session is redirected without a prompt. On arrival it shows an "Identity Confirmed" toast; pass `toasts` to `ViewReauthenticate` to change it.

Adjust the copy through `header` and `subTitle`, or replace parts of the password form through its slots. This replaces the submit button and keeps everything else:

```vue
<script setup>
import ViewReauthenticate from "@vueda/views/ViewReauthenticate.vue";

import ButtonIcon from "@/components/ButtonIcon.vue";
</script>

<template>
    <ViewReauthenticate sub-title="Please enter your password again to verify your identity">
        <template #action-bar="{ loading }">
            <ButtonIcon :fluid="true" verb="submit" label="Verify" :loading="loading" tone="primary" type="submit" />
        </template>
    </ViewReauthenticate>
</template>
```

`field(password)` and `widget(password)` replace the password row or only its input. Any other slot is forwarded to the form being rendered.

## Build a Change-Password View

Change-password is another hand-authored form variant. It uses `AuthForm` (a simpler wrapper than `AuthorizingForm` that does not watch login state or redirect):

```vue
<script setup>
import FormField from "@vueda/form/form-model/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import AuthForm from "@vueda/views/AuthForm.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
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
                <WidgetTextInput :required="true" type="password" />
            </FormField>
            <FormField label="New Password" name="new_password1" required>
                <WidgetTextInput :required="true" type="password" />
            </FormField>
            <FormField label="Confirm New Password" name="new_password2" required>
                <WidgetTextInput :required="true" type="password" />
            </FormField>
        </template>
    </AuthForm>
</template>
```

`AuthForm` and `AuthorizingForm` share the same layout and slot structure. The difference is that `AuthForm` does not watch login state and does not redirect. Use `AuthForm` for authenticated operations that stay on the current page after success.

## Hand-Authored Form Patterns

Auth views use `FormField` and `WidgetTextInput` outside the metadata-driven CRUDL surface. In CRUDL views, field components are rendered automatically from model-info metadata. In auth views, you declare fields manually in the template.

The key differences from CRUDL forms:

- **`formProps.initialValues`** must be defined explicitly. CRUDL forms populate initial values from a server-retrieved object; auth forms set them to empty strings or defaults.
- **Field `name` props** must match the keys the server endpoint expects. There is no model-info metadata to enforce naming.
- **No `formModelName` prop.** Auth forms do not reference a model config, so config-driven field behaviour (read-only states, visibility rules) does not apply.
- **`WidgetTextInput` type variants** are set directly. Use `type="password"` for password fields, `type="otp"` for one-time codes. The full set of supported types is: `text`, `password`, `number`, `otp`, and `mask`.

Validation in hand-authored forms uses the same `FormField` props as CRUDL forms: `required`, `maxLength`, `minLength`, and `patternRegex` (available when `validation="text"` is set). Server-side validation errors are mapped by field name; if the server returns `{ "email": ["This field is required."] }`, the error surfaces on the `FormField` with `name="email"`.

### Update Form Values Programmatically

`AuthForm`, `AuthorizingForm`, and `ViewSignIn` emit two form-related events on mount. The `form-object` event provides a readonly ref for observing current values. The `form-context` event provides the form context, including the supported `updateValue(name, value)` mutation method.

Capture the form context when a custom control needs to fill or replace field values:

```vue
<script setup>
import ViewSignIn from "@vueda/views/ViewSignIn.vue";

let formContext = null;

const handleFormContext = (context) => {
    formContext = context;
};

const fillCredentials = () => {
    formContext?.updateValue("email", "demo@example.com");
    formContext?.updateValue("password", "example-password");
};
</script>

<template>
    <ViewSignIn @form-context="handleFormContext">
        <template #suffix>
            <button type="button" @click="fillCredentials">Use demo credentials</button>
        </template>
    </ViewSignIn>
</template>
```

Do not assign properties through the ref emitted by `form-object`. Its value comes from the form context's readonly state and Vue will reject the write.

## Verification Checklist

After building auth views, verify the following:

- Submitting valid credentials logs the user in and triggers a redirect.
- Submitting invalid credentials displays a server-provided error message on the form.
- Navigating to a protected route while unauthenticated redirects to sign-in with `?redirect=/original-path`, and successful login returns to the original path.
- When MFA is required, the sign-in form routes to the 2FA view instead of completing the redirect.
- Completing 2FA clears `authPendingFlow` and triggers the normal redirect chain.
- The re-authentication view only redirects once `authPendingFlow` is empty.
- The change-password view displays per-field validation errors from the server (e.g., "This password is too common.").

## Troubleshooting

**Sign-in succeeds but no redirect occurs.** Check that the view uses `AuthorizingForm`, not `AuthForm`. `AuthForm` does not watch login state. Also verify that the router has a route named `welcome` (the default redirect target) or that the `redirect` prop is set.

**MFA flow is not detected after login.** The who-is response after the login `401` must carry `auth_pending_flow: "mfa_authenticate"`. If it does not, `authPendingFlow` stays empty. Inspect the raw who-is response. Also verify that the router has a route named `2fa`.

**Form values are not sent to the server.** Verify that field `name` props match the keys the server expects. `ActionForm` reads values from `formContext.state.submittingValues`, which uses the field `name` as the key.

**Toast shows "Signed in, but could not open the next page".** The sign-in succeeded, but the redirect target does not resolve to a route. The browser console logs the destination that failed. Check that the router has the target named route, `welcome` by default, or that `route.query.redirect` matches an existing path.

**Re-authentication redirect fires immediately.** If the user already has a recent login, `authPendingFlow` is already empty and the watcher fires on mount. This is expected; the user does not need to re-authenticate if the server considers their session recent.

**Password re-authentication succeeds but the guarded action still returns 401.** The user has a two-factor device, so their `authPendingFlow` is `mfa_reauthenticate` and only a code refreshes their session. The password endpoint accepts the password but the server does not count it. Render the code form for that flow, as the re-authentication view above does.

## Relevant Implementation Surface

- Vue.js Components:
    - {@api vue:component:AuthorizingForm}
    - {@api vue:component:AuthForm}
    - {@api vue:component:ViewReauthenticate}
    - {@api vue:component:ViewTwoFactorAuth}
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
    - {@api rest:endpoint:POST:/vueda.user/2fa/reauthenticate/}
    - {@api rest:endpoint:POST:/vueda.user/change_password/}
