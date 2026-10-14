---
title: Build Auth Views
status: draft
audience: integrator
type: how-to
---

# Build Auth Views

VUEDA ships views for sign-in, {@term Two-Factor Authentication}, {@term Reauthentication}, password changes and resets, and device setup. This guide shows how to route them, add the forgot and reset password flow, and build your own form when a view needs changes. [Auth & MFA Views](../reference/components/auth-and-mfa.md) shows each view's layout.

## Before You Begin

- Complete [Client Plugin Prerequisites](client-plugin-prerequisites.md): the theme, the {@term CRUD} adapters, and a mounted {@api vue:component:Sonner} toaster. The auth views report results through toasts.
- The server's root `urls.py` includes {@api py:module:vueda.user.urls} under `routes/`. The scaffolded project does this, and {@api js:module:@arrai-innovations/vueda/stores/storeUser} sends its requests to those paths.

## Route the Shipped Views

The library navigates to the route names below, so your router must define each one that you use.

| Route name        | What sends the user there                                                                                                                                                            | View                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `sign-in`         | Your `requireAuth` guards; `ViewTwoFactorAuth` when no sign-in is waiting for a code; `AuthForm` after a refused submit by a signed-out user; the password views' `signInTo` default | {@api vue:component:ViewSignIn}         |
| `2fa`             | `AuthorizingForm`, when the server asks for a second factor during sign-in                                                                                                           | {@api vue:component:ViewTwoFactorAuth}  |
| `reauthenticate`  | `AuthForm`, when the session owes {@term Reauthentication}; `requireRecentAuth` when you pass it this route                                                                          | {@api vue:component:ViewReauthenticate} |
| `welcome`         | `AuthorizingForm` after sign-in, when neither a `redirect` query value nor a `redirect` prop is set                                                                                  | Your landing page                       |
| `forgot-password` | `ViewResetPassword`'s "Request a new link" button                                                                                                                                    | {@api vue:component:ViewForgotPassword} |
| `reset-password`  | The emailed reset link                                                                                                                                                               | {@api vue:component:ViewResetPassword}  |
| `setup-device`    | `ViewRecoveryCodes`'s set-up button, which appears when the account has no device                                                                                                    | {@api vue:component:ViewSetupDevice}    |

The integrator template's `client/src/router/index.js` defines every route in the table. It also defines `recovery-codes`, which shows {@api vue:component:ViewRecoveryCodes}. Its two-factor, reauthentication, and device routes are:

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
    component: async () => (await import("@vueda/views/ViewReauthenticate.vue")).default,
    meta: { title: "Confirm Your Identity" },
    beforeEnter: (to) => requireAuth({ name: "sign-in" }, to, router, pinia),
},
{
    path: "/setup-device/",
    name: "setup-device",
    component: async () => (await import("@vueda/views/ViewSetupDevice.vue")).default,
    props: { app: "vueda_user", model: "totpdevice" },
    meta: { title: "Set Up Two-Factor Device" },
    beforeEnter: (to) => requireRecentAuth({ name: "reauthenticate" }, to, router, pinia),
},
{
    path: "/recovery-codes/",
    name: "recovery-codes",
    component: async () => (await import("@vueda/views/ViewRecoveryCodes.vue")).default,
    meta: { title: "Recovery Codes" },
    beforeEnter: (to) => requireRecentAuth({ name: "reauthenticate" }, to, router, pinia),
},
```

A user who still owes a two-factor code stays signed out until the server accepts it, so `2fa` uses `requireUnauth`.

The server refuses device setup and recovery codes without a recent session, so `setup-device` and `recovery-codes` use `requireRecentAuth` and send the user to `reauthenticate`. `ViewSetupDevice` takes `app` and `model` props that name the device model. VUEDA's device model is `totpdevice` in the `vueda_user` app. Neither page is part of a flow, so link them from your account settings. When the device is active, `ViewSetupDevice` goes to the `returnPath` query value if the link sets one.

{@api vue:component:ViewChangePassword} also acts for a signed-in user. The server accepts a password change without a recent session, so route it at any path behind `requireAuth`.

## Guard the Routes

Add a guard to each route's `beforeEnter`:

- {@api js:function:@arrai-innovations/vueda/router/guards#requireAuth} sends a signed-out user to the route that you pass, usually `sign-in`, and records the refused path in the `redirect` query parameter. [Routing and View Resolution Model](../core-concepts/routing-and-view-resolution-model.md#route-guard-chain) describes it and how `makeCRUDRoutes` applies it.
- {@api js:function:@arrai-innovations/vueda/router/guards#requireUnauth} sends a signed-in user to the route that you pass. Use it on the sign-in, two-factor, and password reset routes.
- {@api js:function:@arrai-innovations/vueda/router/guards#requireRecentAuth} sends a user who has not confirmed their identity recently to the route that you pass, usually `reauthenticate`, with the same `redirect` query parameter.
- {@api js:function:@arrai-innovations/vueda/router/guards#requireCurrentUser} waits for the current user to load and lets anyone through. The template uses it on its not-found route.

Each guard waits for the current-user request. When that request fails, the guard rejects the navigation with the request error, and the next navigation sends the request again.

These guards change only what the client shows. The server checks sign-in and recent authentication on every request.

## Add the Forgot and Reset Password Flow

1. Give the forgot password endpoint a working cache. {@api py:class:vueda.user.views.VuedaForgotPasswordView} accepts one request per address per minute and answers `429` to the next. It also limits each IP address to 20 requests an hour. [Configure the Cache and Sessions](configure-cache-and-sessions.md) describes the backends that keep these limits across processes.
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
- A `429` response rejects with {@api js:class:@arrai-innovations/vueda/utils/errors#RateLimitedError}. The form shows its message in a failure toast and shows no error on the form. [Rate-Limited Auth Endpoints](configure-cache-and-sessions.md#rate-limited-auth-endpoints) lists each limit.
- Any other failure shows an error toast titled by [`actionErrorSummary`]{@api vue:component:ActionForm:prop:actionErrorSummary}. When that prop is unset, the title is "Action Failed".

### Redirect Chain

`AuthorizingForm` watches the user store while the view is active. It acts on mount and after each change to the sign-in state:

1. When [`authPendingFlow`]{@api js:property:@arrai-innovations/vueda/stores/storeUser#storeUser.authPendingFlow} is `mfa_authenticate`, a two-factor sign-in, it navigates to `2fa`. The `redirect` query value goes with it.
2. Once the user signs in, it navigates to the first destination present: the `redirect` query value, the [`redirect` prop]{@api vue:component:AuthorizingForm:prop:redirect}, then `{ name: "welcome" }`.

With [`requireRecentLogin`]{@api vue:component:AuthorizingForm:prop:requireRecentLogin}, step 2 also waits until `authPendingFlow` is empty.

After the navigation completes, a "Signed In" toast appears. When the navigation fails, a "Signed in, but could not open the next page" toast appears, and the console logs `[vueda] Sign-in redirect failed for` with the destination. The [`toasts`]{@api vue:component:AuthorizingForm:prop:toasts} prop replaces either message. Its `success` and `redirectFailed` entries each take a `title` and a `description`, and a field that you leave out keeps its default:

```vue
<AuthorizingForm
    :run-action="handleSubmit"
    :toasts="{ success: { title: 'Welcome Back', description: 'Your dashboard is ready.' } }"
/>
```

Because the chain runs on mount, a signed-in user who opens a view built on `AuthorizingForm` is sent on at once.

## Route Two-Factor Sign-In

When an account has two-factor authentication, the login endpoint answers `401`. The store then reloads the current user. While the sign-in waits for a code, the who-is response carries the stage as `auth_pending_flow`, and the store copies it into `authPendingFlow`. `login` resolves, and `AuthorizingForm` navigates to `2fa`. `loggedIn` stays `false` until the server accepts a code.

The server keeps the waiting stage in the session. A page reload during the two-factor step therefore stays on it. When no sign-in is waiting, for example because it expired, `ViewTwoFactorAuth` shows "Your sign-in has expired" and sends the user to `sign-in`, keeping the `redirect` query value.

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

On success, `twoFactorAuthenticate` reloads the current user, which sets `loggedIn` and clears `authPendingFlow`. The two-factor view's redirect chain then continues from the `redirect` query value that sign-in passed on.

## Build a Re-Authentication View

The server requires a recent sign-in for sensitive requests, such as setting up a two-factor device. The proof that it accepts depends on the account. The who-is response names the flow that the session owes as `auth_pending_flow`, and the store copies it into `authPendingFlow`:

- `mfa_reauthenticate`: the user has a two-factor device, so they must confirm a code. Their password alone does not count. [`twoFactorReauthenticate`]{@api js:method:@arrai-innovations/vueda/stores/storeUser#storeUser.twoFactorReauthenticate} completes it.
- `reauthenticate`: the user has only a password, so they confirm the password. [`reauthenticate`]{@api js:method:@arrai-innovations/vueda/stores/storeUser#storeUser.reauthenticate} completes it.
- `null`: the session is recent, or the user has neither a password nor a device, so nothing is pending.

A session counts as recent for `ACCOUNT_REAUTHENTICATION_TIMEOUT` seconds after the user completes the flow that their account requires, at sign-in or by reauthenticating. The default is 300. [`vueda.core.reauthentication`]{@api py:module:vueda.core.reauthentication} decides which flow an account requires.

The user reaches the `reauthenticate` route in one of two ways:

- `AuthForm` navigates there when `authPendingFlow` names a reauthentication flow, as [Build a Form for a Signed-In Operation](#build-a-form-for-a-signed-in-operation) describes.
- `requireRecentAuth` navigates there before the route opens.

Both record the refused path in the `redirect` query value.

### Use the Shipped View

{@api vue:component:ViewReauthenticate} reads `authPendingFlow` and renders the matching form. For `mfa_reauthenticate`, it renders `ViewTwoFactorAuth`, with method selection, code sending, and recovery codes. For `reauthenticate`, it renders a single password field. Both forms wait until `authPendingFlow` is empty, then return to the `redirect` path with an "Identity Confirmed" toast. A user whose session is already recent is sent on without a prompt.

`header`, `subTitle`, `toasts`, and `AuthorizingForm` props such as `redirect` pass through to whichever form is showing. The password form also takes these slots:

- `field(password)` replaces the password row, including its label.
- `widget(password)` replaces only the input.
- `action-bar` replaces the "Verify" button.

Any other slot is forwarded to the form being rendered. This replaces the subtitle and the button:

```vue
<script setup>
import Button from "@vueda/controls/button/Button.vue";
import ViewReauthenticate from "@vueda/views/ViewReauthenticate.vue";
</script>

<template>
    <ViewReauthenticate sub-title="Enter your password again to continue.">
        <template #action-bar="{ loading }">
            <Button type="submit" tone="primary" :disabled="loading">Continue</Button>
        </template>
    </ViewReauthenticate>
</template>
```

Route this component as `reauthenticate` in place of `@vueda/views/ViewReauthenticate.vue`.

### Build Your Own View

A custom view must handle both flows. Build it on `AuthorizingForm` with `requireRecentLogin`, so that it waits until `authPendingFlow` is empty before it returns to the `redirect` path. Submit the password through `reauthenticate` and a code through `twoFactorReauthenticate`. Each call reloads the current user, which clears `authPendingFlow` once the server accepts the proof.

A form that only asks for the password leaves a user with a two-factor device stuck. The server accepts the password, but the session still owes `mfa_reauthenticate`.

## Build a Form for a Signed-In Operation

Use {@api vue:component:AuthForm} for a form that a signed-in user submits, such as a password change. After a successful submit, `ActionForm` shows its success toast, and `AuthForm` navigates to the `returnPath` query value. Without that value, it navigates to its [`redirect` prop]{@api vue:component:AuthForm:prop:redirect}. With neither set, the user stays on the page.

By default, `AuthForm` treats its action as one that needs a recent session. Whenever `authPendingFlow` names a reauthentication flow, it shows "Please verify your account again before proceeding" and navigates to `reauthenticate`. That includes a flow that is already pending when the form opens. `authPendingFlow` belongs to the whole session, so a who-is response from another view or a route guard can set it.

The store actions that need a recent session, such as `setupTOTPDevice` and `getRecoveryCodes`, reload the current user before they reject with an `UnauthorizedError`. `AuthForm` then handles the refused submit from the reloaded state:

- A signed-out user goes to `sign-in`, with the current path as the `redirect` query value.
- A user with a pending reauthentication flow goes to `reauthenticate`. The flow change and the refused submit lead to the same navigation, so the user sees one toast and one navigation.
- When the router cannot complete either navigation, the error goes to the form's usual error handling.
- Every other error goes to the form's usual error handling.

Set [`requireRecentAuth`]{@api vue:component:AuthForm:prop:requireRecentAuth} to `false` for a form whose action the server accepts without a recent session. The user then stays on the form while a reauthentication flow is pending. Change-password is one such action: the server checks the current password instead. `changePassword` does not reload the current user, so its `UnauthorizedError` goes to the form's usual error handling. {@api vue:component:ViewChangePassword} sets `requireRecentAuth` to `false`, and so does this form:

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
    <AuthForm header="Change Password" :run-action="handleSubmit" :form-props="formProps" :require-recent-auth="false">
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
- For an account with two-factor authentication, sign-in opens `2fa`, and a valid code completes it. Reloading the page during that step keeps the user on it.
- A request that needs a recent sign-in opens `reauthenticate`. An account with a two-factor device gets the code form, and an account without one gets the password form. Confirming returns to the original page.
- A forgot password request shows "Check Your Email", and a second request for the same address within a minute is refused.
- The emailed link opens `reset-password`, and a password that the validators reject shows an error on the password field.
- The change-password form shows server errors on its fields, such as "This password is too common."

## Troubleshooting

**Sign-in succeeds but the page does not change.** A "Signed in, but could not open the next page" toast means the destination failed. The console line `[vueda] Sign-in redirect failed for` names it. The usual cause is a missing `welcome` route; define it or set the `redirect` prop.

**Two-factor sign-in is not detected.** Inspect the who-is response that follows the login `401`. It must carry `auth_pending_flow: "mfa_authenticate"`. Also check that the router defines `2fa`.

**The two-factor view shows "Your sign-in has expired".** The session has no sign-in waiting for a code. The waiting stage may have expired, or the user opened `2fa` directly. The view returns the user to `sign-in` to start again.

**Form values do not reach the server.** Check that each field's `name` matches the key that the endpoint expects.

**The re-authentication view redirects at once.** The session is already recent, so `authPendingFlow` is empty on mount. The server accepts the recent sign-in, so no confirmation is needed.

**A password confirmation succeeds, but the guarded request still returns `401`.** The user has a two-factor device, so the session owes `mfa_reauthenticate`, and only a code makes it recent. The server accepts the password but does not count it. Render the code form for that flow, as `ViewReauthenticate` does.

**A sign-in or two-factor code request returns `400` with "Too many failed login attempts. Try again later."** Too many wrong passwords or codes used up the `login_failed` limit for this email address, user, or IP address. allauth reports this limit as a {@term Non-Field Error}, so the form shows it like any other.

**A sign-in, password, or code-sending request returns `429`.** The endpoint's rate limit is used up for this user, address, or IP address. The store action rejects with `RateLimitedError`, and the shipped views show its message in a failure toast. VUEDA's DRF throttles send a `Retry-After` header, and the message then says how long to wait. allauth's `login` and `reauthenticate` limits send no `Retry-After` header. [Rate-Limited Auth Endpoints](configure-cache-and-sessions.md#rate-limited-auth-endpoints) lists each limit, its default, and the setting that changes it.

**Forgot password requests fail with a server error.** The cooldown needs a reachable cache; see [Configure the Cache and Sessions](configure-cache-and-sessions.md).
