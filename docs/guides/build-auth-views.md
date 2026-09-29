---
title: Build Auth Views
status: draft
audience: integrator
type: how-to
---

# Build Auth Views

VUEDA ships views for sign-in, {@term Two-Factor Authentication}, password changes and resets, and device setup. This guide shows how to route them, add the forgot and reset password flow, and build your own form when a view needs changes. [Auth & MFA Views](../reference/components/auth-and-mfa.md) shows each view's layout.

## Before You Begin

- Complete [Client Plugin Prerequisites](client-plugin-prerequisites.md): the theme, the {@term CRUD} adapters, and a mounted {@api vue:component:Sonner} toaster. The auth views report results through toasts.
- The server's root `urls.py` includes {@api py:module:vueda.user.urls} under `routes/`. The scaffolded project does this, and {@api js:module:@arrai-innovations/vueda/stores/storeUser} sends its requests to those paths.

## Route the Shipped Views

The library navigates to the route names below, so your router must define each one that you use.

| Route name        | What sends the user there                                                                                                    | View                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `sign-in`         | Your `requireAuth` guards; `ViewTwoFactorAuth` when no sign-in is waiting for a code; the password views' `signInTo` default | {@api vue:component:ViewSignIn}                        |
| `2fa`             | `AuthorizingForm`, when the server asks for a second factor                                                                  | {@api vue:component:ViewTwoFactorAuth}                 |
| `reauthenticate`  | `AuthForm`, when the server asks for {@term Reauthentication}; `requireRecentAuth` when you pass it this route               | Your own; see [below](#build-a-re-authentication-view) |
| `welcome`         | `AuthorizingForm` after sign-in, when neither a `redirect` query value nor a `redirect` prop is set                          | Your landing page                                      |
| `forgot-password` | `ViewResetPassword`'s "Request a new link" button                                                                            | {@api vue:component:ViewForgotPassword}                |
| `reset-password`  | The emailed reset link                                                                                                       | {@api vue:component:ViewResetPassword}                 |

The integrator template's `client/src/router/index.js` defines `welcome`, `sign-in`, `forgot-password`, and `reset-password`. Add `2fa` and `reauthenticate` beside them:

```js
{
    path: "/2fa/",
    name: "2fa",
    component: async () => (await import("@vueda/views/ViewTwoFactorAuth.vue")).default,
    meta: { title: "Two-Factor Authentication" },
    beforeEnter: () => requireUnauth(signedInHome, router, pinia),
},
{
    path: "/reauthenticate/",
    name: "reauthenticate",
    component: () => import("@/views/ViewReauthenticate.vue"),
    meta: { title: "Confirm Your Identity" },
    beforeEnter: (to) => requireAuth({ name: "sign-in" }, to, router, pinia),
},
```

`ViewReauthenticate.vue` is the view that you build in [Build a Re-Authentication View](#build-a-re-authentication-view).

{@api vue:component:ViewChangePassword}, {@api vue:component:ViewSetupDevice}, and {@api vue:component:ViewRecoveryCodes} act for a signed-in user, so route them at any path behind `requireAuth`. `ViewSetupDevice` takes `app` and `model` props that name the device model.

## Guard the Routes

Add a guard to each route's `beforeEnter`:

- {@api js:function:@arrai-innovations/vueda/router/guards#requireAuth} sends a signed-out user to the route that you pass, usually `sign-in`, and records the refused path in the `redirect` query parameter. [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md#route-guard-chain) describes it and how `makeCRUDRoutes` applies it.
- {@api js:function:@arrai-innovations/vueda/router/guards#requireUnauth} sends a signed-in user to the route that you pass. Use it on the sign-in, two-factor, and password reset routes.
- {@api js:function:@arrai-innovations/vueda/router/guards#requireRecentAuth} sends a user who has not confirmed their identity recently to the route that you pass, usually `reauthenticate`, with the same `redirect` query parameter.

These guards change only what the client shows. The server checks sign-in and recent authentication on every request.

## Add the Forgot and Reset Password Flow

1. Give the forgot password endpoint a working cache. {@api py:class:vueda.user.views.VuedaForgotPasswordView} accepts one request per address per minute and answers `429` to the next. [Configure the Cache and Sessions](configure-cache-and-sessions.md) describes the backends that keep this limit across processes.
2. Set `FRONTEND_DOMAIN` and `FRONTEND_RESET_URL` (default `/reset-password`) on the server. `FRONTEND_DOMAIN` is the client's origin with its scheme, such as `https://app.example.com`. The server builds the emailed link from them, with an encoded account id as the last path segment and the reset `token` in the query string.
3. Make sure the server can send email. The user adapter named by `VUEDA_USER_ADAPTER` sends the message, and queues it with {@term VDQ (VUEDA Dispatch Queue)} when `vueda.vdq` is installed.
4. Route `forgot-password` and `reset-password`. `ViewResetPassword` needs `pk` from the path and `token` from the query:

    ```js
    {
        path: "/reset-password/:pk/",
        name: "reset-password",
        component: async () => (await import("@vueda/views/ViewResetPassword.vue")).default,
        props: (route) => ({ pk: route.params.pk, token: String(route.query.token ?? "") }),
        beforeEnter: () => requireUnauth(signedInHome, router, pinia),
    },
    ```

    The path must match `FRONTEND_RESET_URL`.

5. Link the sign-in view to the flow with [`forgotPasswordTo`]{@api vue:component:ViewSignIn:prop:forgotPasswordTo}, for example `props: { forgotPasswordTo: { name: "forgot-password" } }` on the `sign-in` route. The view shows a "Forgot password?" link only when this prop is set.

The flow then behaves as follows:

- `ViewForgotPassword` calls [`forgotPassword`]{@api js:method:@arrai-innovations/vueda/stores/storeUser#storeUser.forgotPassword}. The server answers the same way whether or not an account uses the address, and the view shows "Check Your Email" either way.
- `ViewResetPassword` checks the link on mount with [`checkResetLinkIsValid`]{@api js:method:@arrai-innovations/vueda/stores/storeUser#storeUser.checkResetLinkIsValid}. A rejected link replaces the form with a message and a "Request a new link" button.
- On submit, `ViewResetPassword` calls [`resetPassword`]{@api js:method:@arrai-innovations/vueda/stores/storeUser#storeUser.resetPassword}. A password that the server's validators reject appears as an error on the password field. After a successful reset, the view goes to `signInTo`.

## Build a Sign-In View

Use {@api vue:component:AuthorizingForm} when a sign-in form must differ from `ViewSignIn`. It wraps {@api vue:component:ActionForm} and sends the user on after sign-in.

```vue
<script setup>
import Button from "@vueda/controls/button/Button.vue";
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
    <AuthorizingForm
        header="Sign In"
        action-error-summary="Sign In Failed"
        :run-action="handleSubmit"
        :form-props="formProps"
    >
        <template #action-form-inner>
            <FormField validation="text" label="Email" name="email">
                <WidgetTextInput :required="true" autocomplete="username" />
            </FormField>
            <FormField validation="text" label="Password" name="password">
                <WidgetTextInput :required="true" type="password" autocomplete="current-password" />
            </FormField>
        </template>
        <template #action-bar="{ loading }">
            <Button type="submit" tone="primary" :disabled="loading">Sign In</Button>
        </template>
    </AuthorizingForm>
</template>
```

Write the fields this way:

- Set every field in `formProps.initialValues`. The form has no server object to start from.
- Give each {@api vue:component:FormField} the `name` that the endpoint expects. `runAction` receives `{ formValues }`, keyed by field name, without {@term Ignored Field} values.
- Set [`validation="text"`]{@api vue:component:FormField:prop:validation} to enable `maxLength`, `minLength`, and `patternRegex` on a field.
- Pass `type` to {@api vue:component:WidgetTextInput} for the native input type, such as `password`.
- Replace the [`action-bar` slot]{@api vue:component:ActionForm:slots}. The default bar has a confirm and a cancel button, and a sign-in form has nowhere to cancel to.

The server validates every submit. [`login`]{@api js:method:@arrai-innovations/vueda/stores/storeUser#storeUser.login} ends in one of these outcomes:

- It resolves when the user is signed in or the server asks for a second factor. `AuthorizingForm` shows no toast for the submit itself, because the redirect announces the sign-in. Pass [`onSubmissionSuccessHandler`]{@api vue:component:AuthorizingForm:prop:onSubmissionSuccessHandler} to run your own code instead; `ViewForgotPassword` does this to show its message.
- A `400` response becomes {@term Server Feedback}: each error appears on the field with the same `name`, and a {@term Non-Field Error} appears on the form. [Error and Validation Contract](../core-concepts/error-and-validation-contract.md) describes the error shapes.
- Any other failure shows an error toast titled by [`actionErrorSummary`]{@api vue:component:ActionForm:prop:actionErrorSummary}. When that prop is unset, the title is "Action Failed".

### Redirect Chain

`AuthorizingForm` watches the user store while the view is active. It acts on mount and after each change to the sign-in state:

1. When [`pendingFlow`]{@api js:property:@arrai-innovations/vueda/stores/storeUser#storeUser.pendingFlow} is a two-factor sign-in (`id` is `mfa_authenticate`), it navigates to `2fa`. The `redirect` query value goes with it.
2. Once the user signs in, it navigates to the first destination present: the `redirect` query value, the [`redirect` prop]{@api vue:component:AuthorizingForm:prop:redirect}, then `{ name: "welcome" }`.

With [`requireRecentLogin`]{@api vue:component:AuthorizingForm:prop:requireRecentLogin}, step 2 also waits for [`recentlyLoggedIn`]{@api js:property:@arrai-innovations/vueda/stores/storeUser#storeUser.recentlyLoggedIn}.

After the navigation completes, a "Signed In" toast appears. When the navigation fails, a "Signed in, but could not open the next page" toast appears, and the console logs `[vueda] Sign-in redirect failed for` with the destination.

Because the chain runs on mount, a signed-in user who opens a view built on `AuthorizingForm` is sent on at once.

## Route Two-Factor Sign-In

When an account has two-factor authentication, the login endpoint answers `401` and lists the next steps under `data.flows` in the response body. The store sets `pendingFlow` to the step that the server marks pending, and `login` resolves. `AuthorizingForm` then navigates to `2fa`. `loggedIn` stays `false` until the server accepts a code.

`ViewTwoFactorAuth` handles every method. The user picks a method, requests a code for SMS or email, and enters it; a recovery code goes through the same form. Route it as `2fa` and use it unchanged where you can.

A custom two-factor view for authenticator app codes submits [`twoFactorAuthenticate`]{@api js:method:@arrai-innovations/vueda/stores/storeUser#storeUser.twoFactorAuthenticate} and uses {@api vue:component:WidgetOTPInput} for the code:

```vue
<script setup>
import FormField from "@vueda/form/form-model/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import AuthorizingForm from "@vueda/views/AuthorizingForm.vue";
import WidgetOTPInput from "@vueda/widgets/WidgetOTPInput.vue";
import { reactive } from "vue";

const userStore = storeUser();
const formProps = reactive({
    initialValues: {
        code: "",
    },
});

const handleSubmit = ({ formValues }) => {
    return userStore.twoFactorAuthenticate({ code: formValues.code });
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
            <FormField label="Code" name="code">
                <WidgetOTPInput :required="true" :maxlength="6" />
            </FormField>
        </template>
    </AuthorizingForm>
</template>
```

For SMS and email, the view must first send a code with [`sendTwoFactorAuthenticationCode`]{@api js:method:@arrai-innovations/vueda/stores/storeUser#storeUser.sendTwoFactorAuthenticationCode}, passing the chosen `method`.

On success, `twoFactorAuthenticate` clears `pendingFlow` and reloads the current user. The two-factor view's redirect chain then continues from the `redirect` query value that sign-in passed on.

## Build a Re-Authentication View

The server requires a recent sign-in for sensitive requests, such as setting up a two-factor device. When it refuses one, the user reaches the `reauthenticate` route in one of two ways:

- `AuthForm` navigates there when a submit fails with `401` or `403`, or when the server's `401` lists a reauthentication step. It shows "Please verify your account again before proceeding" and records the current path in the `redirect` query value.
- `requireRecentAuth` navigates there before the route opens, with the same query value.

Build the view with `requireRecentLogin` so that it waits for a recent sign-in, then returns to the `redirect` path:

```vue
<script setup>
import Button from "@vueda/controls/button/Button.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import AuthorizingForm from "@vueda/views/AuthorizingForm.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
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
            <FormField validation="text" label="Password" name="password">
                <WidgetTextInput :required="true" type="password" autocomplete="current-password" />
            </FormField>
        </template>
        <template #action-bar="{ loading }">
            <Button type="submit" tone="primary" :disabled="loading">Confirm</Button>
        </template>
    </AuthorizingForm>
</template>
```

[`reauthenticate`]{@api js:method:@arrai-innovations/vueda/stores/storeUser#storeUser.reauthenticate} clears `pendingFlow` and reloads the current user. `recentlyLoggedIn` then stays `true` for `ACCOUNT_REAUTHENTICATION_TIMEOUT` seconds after the last sign-in or confirmation (default 300).

## Build a Form for a Signed-In Operation

Use {@api vue:component:AuthForm} for a form that a signed-in user submits, such as a password change. It sends the user to `reauthenticate` when the server asks, as described above. After a successful submit, `ActionForm` shows its success toast, and `AuthForm` navigates to the `returnPath` query value. Without that value, it navigates to its [`redirect` prop]{@api vue:component:AuthForm:prop:redirect}. With neither set, the user stays on the page.

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
    return userStore.changePassword(formValues);
};
</script>

<template>
    <AuthForm header="Change Password" :run-action="handleSubmit" :form-props="formProps">
        <template #action-form-inner>
            <FormField validation="text" label="Current Password" name="old_password">
                <WidgetTextInput :required="true" type="password" autocomplete="current-password" />
            </FormField>
            <FormField validation="text" label="New Password" name="new_password1">
                <WidgetTextInput :required="true" type="password" autocomplete="new-password" />
            </FormField>
            <FormField validation="text" label="Confirm New Password" name="new_password2">
                <WidgetTextInput :required="true" type="password" autocomplete="new-password" />
            </FormField>
        </template>
    </AuthForm>
</template>
```

`AuthForm` and `AuthorizingForm` both forward `ActionForm`'s slots, such as `action-form-inner` and `action-bar`.

## Fill Field Values from Code

`AuthForm`, `AuthorizingForm`, and the shipped views built on them emit two events on mount (see {@api vue:component:AuthorizingForm:events}). `form-object` passes a readonly ref to the current values. `form-context` passes the {@term Form Context}. Change values with its [`updateValue(name, value)`]{@api js:property:@arrai-innovations/vueda/use/useForm#FormContext.updateValue} method:

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

Writing through the `form-object` ref fails, because the form state is readonly.

## Verification Checklist

- Valid credentials sign the user in and open the next page with a "Signed In" toast.
- Invalid credentials show the server's message on the form.
- Opening a protected route while signed out goes to `sign-in` with `?redirect=/original-path`, and signing in returns to that path.
- For an account with two-factor authentication, sign-in opens `2fa`, and a valid code completes it.
- A request that needs a recent sign-in opens `reauthenticate`, and confirming returns to the original page.
- A forgot password request shows "Check Your Email", and a second request for the same address within a minute is refused.
- The emailed link opens `reset-password`, and a password that the validators reject shows an error on the password field.
- The change-password form shows server errors on its fields, such as "This password is too common."

## Troubleshooting

**Sign-in succeeds but the page does not change.** A "Signed in, but could not open the next page" toast means the destination failed. The console line `[vueda] Sign-in redirect failed for` names it. The usual cause is a missing `welcome` route; define it or set the `redirect` prop.

**Two-factor sign-in is not detected.** Inspect the login response. It must be a `401` with the pending step under `data.flows`. Also check that the router defines `2fa`.

**Form values do not reach the server.** Check that each field's `name` matches the key that the endpoint expects.

**The re-authentication view redirects at once.** The user already signed in or confirmed within the reauthentication window, so `recentlyLoggedIn` is `true` on mount. The server accepts the recent sign-in, so no confirmation is needed.

**Forgot password requests fail with a server error.** The cooldown needs a reachable cache; see [Configure the Cache and Sessions](configure-cache-and-sessions.md).
