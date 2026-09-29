---
title: Auth & MFA Views
status: draft
audience: designer
type: reference
---

<script setup>
import {
  LOGGED_IN,
  LOGGED_OUT,
  MFA_ENROLLED,
  MFA_PENDING,
  RECOVERY_CODES,
  TOTP_SETUP,
  TWO_FACTOR_METHODS,
  formError,
} from "../../.vitepress/theme/fixtures/authUser.js";
import { SHOWCASE_DEVICE, seedShowcaseDevice } from "../../.vitepress/theme/fixtures/showcaseDevice.js";

const signInProps = { forgotPasswordTo: { name: "forgot-password" } };
const signInAccepts = { login: (payload, store) => { store.loggedIn = true; } };
const signInRejects = { login: () => { throw formError({ non_field_errors: ["Incorrect email or password."] }); } };

const forgotPasswordAccepts = { forgotPassword: () => ({ detail: "Password reset e-mail has been sent." }) };

const resetLinkProps = { pk: "1", token: "demo-token" };
const resetPasswordAccepts = {
  checkResetLinkIsValid: () => ({ detail: "Link is valid." }),
  resetPassword: () => ({ detail: "Password has been reset." }),
};
const resetLinkRejected = {
  checkResetLinkIsValid: () => { throw new Error("Invalid reset link."); },
};

const changePasswordProps = {
  header: "Change Password",
  subTitle: "Pick a strong, unique password. You stay signed in on this device.",
};
const changePasswordAccepts = { changePassword: () => ({ detail: "Password changed." }) };
const changePasswordRejects = {
  changePassword: () => { throw formError({ new_password2: ["The two password fields didn't match."] }); },
};

const twoFactorMethods = { getTwoFactorAuthMethod: () => ({ methods: TWO_FACTOR_METHODS }) };
const twoFactorAccepts = {
  ...twoFactorMethods,
  sendTwoFactorAuthenticationCode: () => ({ detail: "Code sent." }),
  twoFactorAuthenticate: (payload, store) => { store.pendingFlow = null; store.loggedIn = true; },
};
const twoFactorRejects = {
  ...twoFactorMethods,
  sendTwoFactorAuthenticationCode: () => ({ detail: "Code sent." }),
  twoFactorAuthenticate: () => { throw formError({ code: ["That code is not valid or has expired."] }); },
};

// getRecoveryCodes returns the fetched set; generateRecoveryCode returns a rotated one so
// the live demo visibly replaces the list. Both use the endpoint's { data: { unused_codes } } shape.
const rotate = (codes) => codes.map((code) => code.split("-").reverse().join("-"));
const recoveryCodesAccepts = {
  getRecoveryCodes: () => ({ data: { unused_codes: RECOVERY_CODES } }),
  generateRecoveryCode: () => ({ data: { unused_codes: rotate(RECOVERY_CODES) } }),
};

const setupDeviceProps = { ...SHOWCASE_DEVICE };
const setupDeviceSetup = { setupTOTPDevice: () => TOTP_SETUP };
const setupDeviceAccepts = {
  ...setupDeviceSetup,
  activateTOTPDevice: () => ({ detail: "Device activated." }),
};
const setupDeviceRejects = {
  ...setupDeviceSetup,
  activateTOTPDevice: () => { throw formError({ code: ["That code does not match. Check your device and try again."] }); },
};
</script>

# Auth & MFA Views

This page shows the seven account views in the default theme: sign in, forgot password, reset password, {@term Two-Factor Authentication}, device setup, change password, and recovery codes. Each view renders inside one of two card layouts, {@api vue:component:AuthorizingForm} or {@api vue:component:AuthForm}. [Build Auth Views](../../guides/build-auth-views.md) describes how the views route, submit, redirect, and report errors. [Components](./index.md) describes the rules every component page shares.

Each demo mounts the real view with its own user store. The demo replaces the store actions that the view calls with offline stand-ins, so submitting shows the real loading, error, and toast states. Toasts from every demo appear in one overlay in the corner of the window, as in an app.

## Card layouts

`AuthorizingForm` centers its card in the viewport, and the card's heading is the page heading. `AuthForm` places its card at the top of the content column, under the layout's page title. Its card heading reads as a section heading. Both cards use the same frame. Both pass submission to an inner {@api vue:component:ActionForm}. `AuthorizingForm` also handles the redirect after sign-in, and `AuthForm` handles {@term Reauthentication} redirects.

The cards below are diagrams that label each region. The live demos in the sections that follow show the rendered chrome.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="AuthorizingForm" description="centered, card heading is the page heading">
    <div class="flex min-h-44 items-center justify-center rounded border border-dashed border-border bg-muted/10">
      <div class="flex w-60 flex-col gap-3 rounded border border-dashed border-border p-3">
        <div class="text-center text-xs text-muted-foreground"><code>AuthorizingForm.inner</code></div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground"><code>title</code>: header + subTitle</div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">ActionForm fields</div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">action bar (view-supplied)</div>
        <div class="flex h-6 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground"><code>suffix</code> slot: links</div>
      </div>
    </div>
    <template #footer>
      <span>the card centers against the viewport; the demos on this page cancel the viewport-height fill so the card sits inline</span>
      <span>used by: ViewSignIn, ViewForgotPassword, ViewResetPassword, ViewTwoFactorAuth</span>
    </template>
  </DemoCard>
  <DemoCard title="AuthForm" description="top of the column, page title above">
    <div class="flex flex-col gap-3">
      <div class="border-b border-dashed border-border pb-2 text-center text-xs text-muted-foreground">page title, rendered by the layout</div>
      <div class="flex flex-col gap-3 rounded border border-dashed border-border p-3">
        <div class="text-center text-xs text-muted-foreground"><code>AuthForm.inner</code></div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground"><code>title</code>: header + subTitle</div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">ActionForm fields</div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">action bar (ActionForm buttons or view-supplied)</div>
      </div>
    </div>
    <template #footer>
      <span>the card heading is a section heading under the page title</span>
      <span>used by: ViewChangePassword, ViewSetupDevice, ViewRecoveryCodes</span>
    </template>
  </DemoCard>
</VuedaDemo>

Theme keys: {@api theme-key:AuthorizingForm} and {@api theme-key:AuthForm}. {@api theme-key:AuthorizingForm.inner} and {@api theme-key:AuthForm.inner} set the card frame, and {@api theme-key:AuthorizingForm.header} and {@api theme-key:AuthForm.header} set the heading type.

## ViewSignIn

{@api vue:component:ViewSignIn} is an `AuthorizingForm` card with an email field and a password field. One full-width "Sign In" button sits in a strip across the bottom of the form. While the request runs, the button shows a spinner and ignores clicks. A rejected sign-in shows a {@term Non-Field Error} above the fields, and the button stays enabled so the user can try again.

The [`forgotPasswordTo`]{@api vue:component:ViewSignIn:prop:forgotPasswordTo} prop adds a "Forgot password?" link below the form. Without it, no link shows. The first demo sets it.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Credentials accepted. Submit to see the loading state, then the "Signed In" toast.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewSignIn.vue')" :view-props="signInProps" :state="LOGGED_OUT" route-name="sign-in" :mocks="signInAccepts" toasts />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>one primary submit; a sign-in form has nothing to cancel back to</span>
    <span>the "Forgot password?" link shows because the demo sets <code>forgotPasswordTo</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invalid credentials. Submit to see the form-level error above the fields.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewSignIn.vue')" :state="LOGGED_OUT" route-name="sign-in" :mocks="signInRejects" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>the server's <code>non_field_errors</code> message renders as an error alert above the fields</span>
    <span>no "Forgot password?" link: this demo leaves <code>forgotPasswordTo</code> unset</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewForgotPassword

{@api vue:component:ViewForgotPassword} is an `AuthorizingForm` card with one email field and a full-width "Send Reset Link" button. A "Back to sign in" link sits below the form and goes to the [`signInTo`]{@api vue:component:ViewForgotPassword:prop:signInTo} route.

A successful request shows a "Check Your Email" toast. The toast does not say whether an account uses the address, because the server answers the same way either way. Validation errors from the server show in the form. A failed request shows a "Reset Link Not Sent" toast.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Request accepted. Enter an email and submit to see the loading state, then the "Check Your Email" toast.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewForgotPassword.vue')" :state="LOGGED_OUT" route-name="forgot-password" :mocks="forgotPasswordAccepts" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>the same single-button strip as ViewSignIn; the form stays in place after the toast</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewResetPassword

{@api vue:component:ViewResetPassword} is the page that a password reset email links to. Its route passes the link's [`pk`]{@api vue:component:ViewResetPassword:prop:pk} and [`token`]{@api vue:component:ViewResetPassword:prop:token} as props. The view is an `AuthorizingForm` card with a new password field, a confirmation field, and a full-width "Reset Password" button.

On mount the view asks the server whether the link is valid. The form shows while the check runs. When the server rejects the link, an "Invalid Reset Link" message replaces the card, with a "Request a new link" button and a "Sign in" link. The message renders without the card frame. The [`invalid-message`]{@api vue:component:ViewResetPassword:slot:invalid-message} slot replaces it.

A successful reset shows a "Password Reset" toast and goes to the [`signInTo`]{@api vue:component:ViewResetPassword:prop:signInTo} route. The demo's in-memory router keeps the form on screen after that navigation.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valid link. Enter a new password twice and submit to see the "Password Reset" toast.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewResetPassword.vue')" :view-props="resetLinkProps" :state="LOGGED_OUT" route-name="reset-password" :mocks="resetPasswordAccepts" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>the same single-button strip as ViewSignIn; the link check has already passed when the demo settles</span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rejected link. The form shows while the check runs, then the invalid-link message replaces it.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewResetPassword.vue')" :view-props="resetLinkProps" :state="LOGGED_OUT" route-name="reset-password" :mocks="resetLinkRejected" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>"Request a new link" goes to <code>forgotPasswordTo</code>; "Sign in" goes to <code>signInTo</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ViewTwoFactorAuth

{@api vue:component:ViewTwoFactorAuth} is an `AuthorizingForm` card shown after the password step passes, while the server waits for a second factor. It lists the account's verified methods in a {@api vue:component:WidgetSelectDropdown}, with each label in upper case. Choosing a method reveals a six-slot {@api vue:component:WidgetOTPInput} for the code. The method field is a dropdown; [#427](https://github.com/arrai-innovations/vueda/issues/427) tracks a card-based picker.

The buttons stack in one column under the fields:

- For `sms` and `email`, a Send button requests a code. After a send, it is disabled and shows a countdown chip for 60 seconds.
- "Verify" is the primary submit. It stays disabled until a code is entered.
- "Use a recovery code" swaps the method and code fields for one monospaced text input. In that state the button reads "Back to verified methods" and swaps them back.

A rejected code shows its error under the code field.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Three verified methods. Pick one to reveal the code input; pick SMS or email to enable Send.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewTwoFactorAuth.vue')" :state="MFA_PENDING" route-name="2fa" :mocks="twoFactorAccepts" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>the countdown chip keeps its digits aligned while it ticks</span>
    <span>the recovery toggle sits at the start of the column, apart from the Verify button</span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rejected code. Pick a method, enter any code, and verify to see the error under the code field.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewTwoFactorAuth.vue')" :state="MFA_PENDING" route-name="2fa" :mocks="twoFactorRejects" />
</VuedaDemo>
</ClientOnly>

Theme keys: {@api theme-key:ViewTwoFactorAuth}. {@api theme-key:ViewTwoFactorAuth.buttons} stacks the buttons, {@api theme-key:ViewTwoFactorAuth.cooldownChip} styles the countdown, {@api theme-key:ViewTwoFactorAuth.recoveryToggle} places the toggle, and {@api theme-key:ViewTwoFactorAuth.recoveryInput} styles the recovery-code input.

## ViewSetupDevice

{@api vue:component:ViewSetupDevice} is a three-step enrollment flow in an `AuthForm` card: Choose, Verify, and Done. It takes required [`app`]{@api vue:component:ViewSetupDevice:prop:app} and [`model`]{@api vue:component:ViewSetupDevice:prop:model} props and reads its method choices from that model's config through {@api js:function:@arrai-innovations/vueda/use/useModelConfig#useModelConfig}. The demo seeds a small device model into its store for this.

A step track above the fields shows progress. Upcoming steps are dimmed, the current step's number is filled, and a finished step shows a check in place of its number. Each step shows:

- **Choose:** a method dropdown and a "Choose Device" button. Choosing email or SMS reveals a destination field: an email address or a phone number.
- **Verify:** the method and destination fields are disabled, a six-slot code input appears, and the button reads "Verify Device". For the authenticator app, a QR code and a manual key strip show the secret so a user without a camera can type it.
- **Done:** a completion panel with a check icon, "Device added", and a short description replaces the fields, and the button reads "Continue".

A rejected code keeps the flow at Verify and shows the error under the code field.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Walk all three steps. The authenticator app returns a QR code and manual key; email and SMS reveal a destination field.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewSetupDevice.vue')" :view-props="setupDeviceProps" :state="LOGGED_IN" route-name="setup-device" :seed="seedShowcaseDevice" :mocks="setupDeviceAccepts" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>the method field disables itself once the flow reaches Verify</span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rejected verification code. Reach Verify, then submit a code to see the error under the code field.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewSetupDevice.vue')" :view-props="setupDeviceProps" :state="LOGGED_IN" route-name="setup-device" :seed="seedShowcaseDevice" :mocks="setupDeviceRejects" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>the step track stays at Verify until the server accepts the code</span>
  </footer>
</VuedaDemo>
</ClientOnly>

Theme keys: {@api theme-key:ViewSetupDevice}.

- Step track: {@api theme-key:ViewSetupDevice.steps}, {@api theme-key:ViewSetupDevice.step}, {@api theme-key:ViewSetupDevice.stepNum}, {@api theme-key:ViewSetupDevice.stepLabel}, and {@api theme-key:ViewSetupDevice.stepDivider}. Each step's `data-state` is `upcoming`, `current`, or `done`.
- Manual key: {@api theme-key:ViewSetupDevice.manualKey}, {@api theme-key:ViewSetupDevice.manualKeyLabel}, and {@api theme-key:ViewSetupDevice.manualKeyValue}.
- Completion panel: {@api theme-key:ViewSetupDevice.done}, {@api theme-key:ViewSetupDevice.doneIcon}, {@api theme-key:ViewSetupDevice.doneTitle}, and {@api theme-key:ViewSetupDevice.doneDescription}.

## ViewChangePassword

{@api vue:component:ViewChangePassword} is an `AuthForm` card with three password fields: current, new, and confirmation. Each is a {@api vue:component:FormField} around a {@api vue:component:WidgetTextInput}, so it shows labels and errors the same way as any model form. The card heading and subtitle come from `AuthForm`'s [`header`]{@api vue:component:AuthForm:prop:header} and [`subTitle`]{@api vue:component:AuthForm:prop:subTitle} props, which the demo passes.

The buttons are `ActionForm`'s default pair, "Yes, continue" and "Cancel, go back". A field error from the server shows under its field. The validation summary above the fields appears only for errors that no rendered field shows.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Accepted. Submit to see the loading state, then the "Action Succeeded" toast.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewChangePassword.vue')" :view-props="changePasswordProps" :state="LOGGED_IN" route-name="welcome" :mocks="changePasswordAccepts" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>with no return path or redirect set, the form stays in place and accepts input again</span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confirmation mismatch. Submit to see the error under the confirmation field.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewChangePassword.vue')" :view-props="changePasswordProps" :state="LOGGED_IN" route-name="welcome" :mocks="changePasswordRejects" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>the validation summary stays hidden because the error shows beside its field</span>
  </footer>
</VuedaDemo>
</ClientOnly>

Theme keys: {@api theme-key:AuthForm} and {@api theme-key:ActionForm}. {@api theme-key:ActionForm.buttons} lays out the button pair, and {@api theme-key:ActionForm.validation} styles the validation summary.

## ViewRecoveryCodes

{@api vue:component:ViewRecoveryCodes} is an `AuthForm` card whose content depends on whether the signed-in user has a two-factor device.

With a device, the card shows the unused codes in a bordered panel:

- A warning {@api vue:component:Alert} says each code works once.
- The codes form a numbered, two-column monospaced list.
- Download, Print, and Copy All buttons sit under the list. Copy All reads "Copied!" after a copy.
- An action bar below the panel explains regeneration and holds a "Generate new recovery codes" button and a "Go Back" button. Generating replaces the list and shows a toast.

Printing the page leaves out the warning, the buttons, and the action bar, so the printout shows the codes.

The recovery-codes endpoint returns the unused codes and the code counts but does not identify used codes, so the list shows only unused codes ([#428](https://github.com/arrai-innovations/vueda/issues/428)).

Without a device, a warning alert asks the user to set up two-factor first. The action bar then holds a "Set up a device" button and a "Go Back" button.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Device enrolled. Copy All changes its label; Generate replaces the list and shows a toast.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewRecoveryCodes.vue')" :state="MFA_ENROLLED" route-name="welcome" :mocks="recoveryCodesAccepts" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>every code aligns on one column whatever the width of its index</span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">No device enrolled. A set-up prompt replaces the codes panel and the regenerate bar.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewRecoveryCodes.vue')" :state="LOGGED_IN" route-name="welcome" :mocks="recoveryCodesAccepts" />
</VuedaDemo>
</ClientOnly>

Theme keys: {@api theme-key:ViewRecoveryCodes}.

- Codes panel: {@api theme-key:ViewRecoveryCodes.inner}, {@api theme-key:ViewRecoveryCodes.messageContainer}, {@api theme-key:ViewRecoveryCodes.listContainer}, {@api theme-key:ViewRecoveryCodes.list}, {@api theme-key:ViewRecoveryCodes.listItem}, and {@api theme-key:ViewRecoveryCodes.listItemNum}.
- Save buttons: {@api theme-key:ViewRecoveryCodes.savingOptionButtons} and {@api theme-key:ViewRecoveryCodes.savingOptionButton}.
- Action bars: {@api theme-key:ViewRecoveryCodes.actionBar} and {@api theme-key:ViewRecoveryCodes.actionBarTitleTextContainer} with a device; {@api theme-key:ViewRecoveryCodes.emptyActions} without one.

## Customization surface

These tokens apply across the seven views:

- {@api css-token:background} fills both cards, and {@api css-token:border} draws their {@term Hairline} edge.
- {@api css-token:primary} fills the primary buttons and the current and finished steps in the setup step track.
- {@api css-token:muted} and {@api css-token:muted-foreground} set the countdown chip, subtitles, and other secondary text.
- {@api css-token:destructive} colors form-level errors and invalid code inputs.
- {@api css-token:vueda-font-mono} sets the recovery codes, the recovery-code input, and the manual key.

Theme keys shared by the views:

- Cards: {@api theme-key:AuthorizingForm} and {@api theme-key:AuthForm}, described under [Card layouts](#card-layouts).
- Fields: {@api theme-key:Field}, {@api theme-key:FieldLabel}, and {@api theme-key:FieldContent}, described on [Forms](./forms.md). Code inputs use {@api theme-key:InputOTPSlot}, described on [Inputs](./inputs.md).
- Form-level errors: {@api theme-key:FormMessage}.
- Alerts: {@api theme-key:Alert}.

The single-button strip in `ViewSignIn`, `ViewForgotPassword`, and `ViewResetPassword` has no theme key. To restyle it, replace the view's `action-bar` slot ({@api vue:component:ViewSignIn:slot:action-bar}, {@api vue:component:ViewForgotPassword:slot:action-bar}, or {@api vue:component:ViewResetPassword:slot:action-bar}).
