---
title: Auth & MFA Views
status: draft
audience: designer
type: reference
---

<script setup>
import Button from "@vueda/controls/button/Button.vue";
import Field from "@vueda/shell/field/Field.vue";
import FieldContent from "@vueda/shell/field/FieldContent.vue";
import FieldLabel from "@vueda/shell/field/FieldLabel.vue";
import RadioGroup from "@vueda/controls/radio-group/RadioGroup.vue";
import RadioGroupItem from "@vueda/controls/radio-group/RadioGroupItem.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faClock, faEnvelope, faMessage } from "@fortawesome/free-regular-svg-icons";
import { ref } from "vue";
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

// Selected method in the segmented-picker design proposal below. The live views drive
// their own method state; this ref exists only so the proposal card is clickable.
const tfaMethod = ref("totp");

const signInAccepts = { login: (payload, store) => { store.loggedIn = true; } };
const signInRejects = { login: () => { throw formError({ non_field_errors: ["Incorrect email or password."] }); } };

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

Five end-user-facing flows sharing one of two card recipes. **AuthForm** (`theme key: AuthForm`) frames a card below a page-level `PageTitle`, capped at `max-w-3xl` on the outer column and `35rem` on the card itself. **AuthorizingForm** (`theme key: AuthorizingForm`) centers its card both horizontally and vertically, with no `PageTitle`: the card is the whole screen.

Every flow on this page renders live through the `AuthDemo` harness, which mounts the real view in its own sub-app with an isolated user store and an in-memory router. Submitting exercises the real loading, validation, toast, and redirect paths. Neither card renders `PageTitle` itself, so the demos show the card alone; a real shell supplies the page title above it.

Two sections carry a clearly-labeled **design proposal** card alongside the live demo. Those are hand-authored and are not renderings of the default theme; each names the backlog entry that tracks it.

Token surface: `--background`, `--border`, `--muted-foreground`, `--ring`, `--destructive`, `--vueda-font-mono`.

## Chrome anatomy

The two cards below are structural diagrams, not styled specimens: they label the regions and name the theme slot that owns each one. For the actual rendered chrome, read the live demos in the sections that follow, which are the source of truth for padding, fill, radius, and type.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="AuthForm" description=" (column-aligned, page title above)">
    <div class="flex flex-col gap-3">
      <div class="border-b border-dashed border-border pb-2 text-center text-xs text-muted-foreground">PageTitle, a page-level sibling the layout owns</div>
      <div class="flex flex-col gap-3 rounded border border-dashed border-border p-3">
        <div class="text-center text-xs text-muted-foreground"><code>AuthForm.inner</code></div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground"><code>title</code>: header + subTitle</div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">ActionForm fields</div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground"><code>ActionForm.buttons</code></div>
      </div>
    </div>
    <template #footer>
      <span><code>outer</code> caps the column at <code>max-w-3xl</code>; <code>inner</code> is <code>p-8</code> on <code>bg-background</code>, capped at <code>35rem</code> from <code>sm</code> up</span>
      <span><code>header</code> is <code>text-heading</code>; it reads as a section head because a PageTitle sits above the card</span>
      <span>used by: ChangePassword, SetupDevice, RecoveryCodes</span>
    </template>
  </DemoCard>
  <DemoCard title="AuthorizingForm" description=" (centered, no page title)">
    <div class="flex min-h-44 items-center justify-center rounded border border-dashed border-border bg-muted/10">
      <div class="flex w-60 flex-col gap-3 rounded border border-dashed border-border p-3">
        <div class="text-center text-xs text-muted-foreground"><code>AuthorizingForm.inner</code></div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground"><code>title</code>: header + subTitle</div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">ActionForm fields</div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground"><code>ActionForm.buttons</code></div>
      </div>
    </div>
    <template #footer>
      <span><code>root</code> is <code>flex min-h-svh justify-center items-center</code>, so the card centers against the viewport rather than the content flow</span>
      <span>the docs harness cancels <code>min-h-svh</code> for the inline demos; a real page keeps it</span>
      <span>used by: SignIn, TwoFactorAuth</span>
    </template>
  </DemoCard>
</VuedaDemo>

## SignIn

`ViewSignIn` is the default sign-in view: an email and password form in an `AuthorizingForm` card. Post-login routing and MFA pending-flow detection come from `AuthorizingForm` (via `useSignInFlow`); submission, loading, and server-side validation mapping come from the inner `ActionForm`. Unlike the cards above, these demos render the **live component** through the `AuthDemo` harness, so submitting exercises the real loading, toast, and error paths. The first demo hosts a single `Sonner`; because the toast store is global, every demo on this page surfaces its toasts through that one corner overlay, as in a real app.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default · credentials accepted. Submit to see the loading state, then the "Signed In" success toast.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewSignIn.vue')" :state="LOGGED_OUT" route-name="sign-in" :mocks="signInAccepts" toasts />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>AuthorizingForm centers the card; <code>ViewSignIn</code> supplies the email and password fields plus a single primary "Sign In" submit</span>
    <span>theme key: <code>AuthorizingForm</code> · source: <code>ViewSignIn.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invalid credentials. Submit to see the form-scope error and the failure toast.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewSignIn.vue')" :state="LOGGED_OUT" route-name="sign-in" :mocks="signInRejects" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>a server <code>non_field_errors</code> response maps to the ActionForm form-scope error; <code>action-error-summary</code> drives the toast</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ChangePassword

`ViewChangePassword` puts three password fields in an `AuthForm` card: current password, new password, and confirmation. The fields are `FormField` rows wrapping `WidgetTextInput`, not hand-placed `Field` primitives, so they pick up the same validation wiring as any model form. The heading and subtitle come from `AuthForm`'s `header` and `subTitle` props, which the layout supplies. A page-level `PageTitle` sits above the card in a real shell (see [Chrome anatomy](#chrome-anatomy)); the card below is what the view itself renders.

Submission, loading, per-field error mapping, and the form-scope validation summary all come from the inner `ActionForm`. Both demos render the live view through the `AuthDemo` harness, so submitting exercises the real paths.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default · accepted. Submit to see the loading state, then the cleared form.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewChangePassword.vue')" :view-props="changePasswordProps" :state="LOGGED_IN" route-name="welcome" :mocks="changePasswordAccepts" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>card: <code>AuthForm.inner</code> is <code>p-8</code> on <code>bg-background</code>, capped at <code>35rem</code> from <code>sm</code> up</span>
    <span>heading: <code>AuthForm.header</code> uses <code>text-heading</code>; it reads as a section head because a PageTitle sits above it</span>
    <span>buttons: ActionForm's default pair, "Yes, continue" and "Cancel, go back", until the view overrides the labels</span>
    <span>theme keys: <code>AuthForm</code>, <code>ActionForm</code> · source: <code>ViewChangePassword.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Error · confirm mismatch. Submit to see the per-field message and the validation summary.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewChangePassword.vue')" :view-props="changePasswordProps" :state="LOGGED_IN" route-name="welcome" :mocks="changePasswordRejects" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>a server field-error response maps onto the named field; the confirm row shows its own message</span>
    <span>summary: <code>ActionForm.validation</code> renders a danger-toned block above the actions, listing every failing field</span>
    <span>the submit button disables itself while <code>formContext.state.anyError</code> holds, so the guard is form-level, not decoration</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## TwoFactorAuth

`ViewTwoFactorAuth` runs in an `AuthorizingForm` card: the user holds a session token but the server demands a second factor. The view fetches the account's verified methods on mount, renders a method field, and reveals the OTP grid only once a method is chosen. For `sms` and `email` it adds a send-code button with a 60-second cooldown; a recovery-code toggle swaps the OTP grid for a single mono text input.

All of that is one interactive component, so the demo below is one live mount rather than a set of frozen states. Pick a method, send a code, watch the cooldown chip count down, and toggle into the recovery path.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live · three verified methods. Pick one to reveal the OTP grid; pick SMS or email to enable Send.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewTwoFactorAuth.vue')" :state="MFA_PENDING" route-name="2fa" :mocks="twoFactorAccepts" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>method field: <code>WidgetSelectDropdown</code> over the fetched methods, uppercased for the option labels</span>
    <span>the OTP grid is gated on a chosen method; Verify stays disabled until a code is entered</span>
    <span>buttons: <code>ViewTwoFactorAuth.buttons</code> stacks the resend / verify / recovery trio in one column with a 16px top inset</span>
    <span>cooldown: <code>ViewTwoFactorAuth.cooldownChip</code> is a <code>rounded-full bg-muted/70</code> pill with <code>tabular-nums</code> so the digits stay aligned while ticking</span>
    <span>recovery path: <code>ViewTwoFactorAuth.recoveryInput</code> applies <code>font-mono tracking-[0.04em]</code> to the plain text input that replaces the grid</span>
    <span>theme keys: <code>AuthorizingForm</code>, <code>ViewTwoFactorAuth</code> · source: <code>ViewTwoFactorAuth.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rejected code. Enter any code and verify to see the failure path and its toast.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewTwoFactorAuth.vue')" :state="MFA_PENDING" route-name="2fa" :mocks="twoFactorRejects" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span><code>action-error-summary</code> on the AuthorizingForm drives the toast text; the field error lands on the code row</span>
  </footer>
</VuedaDemo>
</ClientOnly>

### Design proposal: segmented method picker

Not shipped. The card below is a proposal, not a rendering of the default theme: it replaces the method dropdown with a segmented rail of option cards carrying a per-option icon and a sub-line (the authenticator app, the masked phone, the email address). It removes a click and reads as the primary decision on the screen instead of a form row.

It is blocked on one primitive-level choice: a new `WidgetSegmentedRadio`, or a `variant="rail"` mode on `WidgetRadioGroup`. `WidgetRadioGroup` cannot express the rail recipe through theme keys alone, because per-option icons, sub-lines, and the group's selected-option chrome need structural template changes plus accessibility plumbing. `ViewSetupDevice` needs the same control, so the choice is taken once and applied to both.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proposal · hand-authored. Compare against the live dropdown above.</header>
  <div class="flex items-center justify-center overflow-clip rounded-vueda-card hairline hairline-border bg-muted/10 px-4 py-10">
    <div class="flex w-full max-w-sm flex-col gap-5 rounded-vueda-card hairline hairline-border bg-card p-6">
      <Field orientation="vertical">
        <FieldLabel>Method</FieldLabel>
        <FieldContent>
          <RadioGroup v-model="tfaMethod" class="grid grid-cols-3 gap-2">
            <div :class="tfaMethod === 'totp' ? 'border-primary bg-primary/5' : 'border-border bg-card'" class="flex cursor-pointer flex-col items-center gap-1.5 rounded-vueda-control border p-3 text-center transition-colors" @click="tfaMethod = 'totp'">
              <RadioGroupItem id="tfa-totp" value="totp" class="sr-only" />
              <FontAwesomeIcon :icon="faClock" class="text-sm text-muted-foreground" />
              <span class="text-xs font-semibold leading-tight">Authenticator</span>
              <span class="text-[11px] leading-tight text-muted-foreground">1Password</span>
            </div>
            <div :class="tfaMethod === 'sms' ? 'border-primary bg-primary/5' : 'border-border bg-card'" class="flex cursor-pointer flex-col items-center gap-1.5 rounded-vueda-control border p-3 text-center transition-colors" @click="tfaMethod = 'sms'">
              <RadioGroupItem id="tfa-sms" value="sms" class="sr-only" />
              <FontAwesomeIcon :icon="faMessage" class="text-sm text-muted-foreground" />
              <span class="text-xs font-semibold leading-tight">SMS</span>
              <span class="text-[11px] leading-tight text-muted-foreground">···· 0413</span>
            </div>
            <div :class="tfaMethod === 'email' ? 'border-primary bg-primary/5' : 'border-border bg-card'" class="flex cursor-pointer flex-col items-center gap-1.5 rounded-vueda-control border p-3 text-center transition-colors" @click="tfaMethod = 'email'">
              <RadioGroupItem id="tfa-email" value="email" class="sr-only" />
              <FontAwesomeIcon :icon="faEnvelope" class="text-sm text-muted-foreground" />
              <span class="text-xs font-semibold leading-tight">Email</span>
              <span class="text-[11px] leading-tight text-muted-foreground">ada@example.com</span>
            </div>
          </RadioGroup>
        </FieldContent>
      </Field>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>selected option: <code>border-primary bg-primary/5</code>; the whole card is the click target, the radio itself is <code>sr-only</code></span>
    <span>the sub-line needs data the current-user payload does not carry yet, so the control and its content are separate pieces of work</span>
  </footer>
</VuedaDemo>

## SetupDevice

`ViewSetupDevice` is a three-step enrolment flow in an `AuthForm` card: choose a method, verify the device with a one-time code, then a confirmation panel. It takes required `app` and `model` props and reads its method choices from `useModelConfig`, so the demo seeds a small device model into the mounted store rather than passing the options in.

The view owns a visible step track (`ViewSetupDevice.steps`, `step`, `stepNum`, `stepLabel`, `stepDivider`) that advances as `step` moves through Choose, Verify, and Done. Completed steps swap their number for a check glyph. Note that the track is built from these dedicated slots and not from the `Stepper` family documented on [Containers](./containers.md); reconciling the two is open Track F work, since the same visual pattern currently has two implementations.

Choosing `email` or `sms` reveals a destination field and sends a code on submit. Choosing the authenticator app instead returns a QR and a manual key, both rendered from the setup response.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live · walk all three steps. Authenticator app returns a QR and manual key; email and SMS reveal a destination field.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewSetupDevice.vue')" :view-props="setupDeviceProps" :state="LOGGED_IN" route-name="setup-device" :seed="seedShowcaseDevice" :mocks="setupDeviceAccepts" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>step track: <code>ViewSetupDevice.step</code> routes <code>data-state</code> through <code>upcoming</code>, <code>current</code>, and <code>done</code>; the done state replaces the number with the registry <code>check</code> icon</span>
    <span>the method field is a real <code>WidgetSelectDropdown</code> over the seeded choices, and it disables itself once the flow reaches Verify</span>
    <span>manual key: <code>ViewSetupDevice.manualKeyValue</code> renders the secret beside the QR so a user without a camera can still enrol</span>
    <span>done panel: <code>ViewSetupDevice.done</code> plus <code>doneIcon</code>, <code>doneTitle</code>, <code>doneDescription</code>, <code>doneActions</code></span>
    <span>theme keys: <code>AuthForm</code>, <code>ActionForm</code>, <code>ViewSetupDevice</code> · source: <code>ViewSetupDevice.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rejected verification code. Reach Verify, then submit a code to see the failure land on the code field.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewSetupDevice.vue')" :view-props="setupDeviceProps" :state="LOGGED_IN" route-name="setup-device" :seed="seedShowcaseDevice" :mocks="setupDeviceRejects" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>the flow holds at Verify on failure; the step track does not advance until the server accepts the code</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## RecoveryCodes

`ViewRecoveryCodes` sits in an `AuthForm` card and gates its whole body on whether the account has a TOTP device enrolled. With a device, it fetches the unused codes on mount and renders them as a numbered list with download, print, and copy-all controls, plus a regenerate submit. Without one, it renders a single warning telling the user to add a second factor first.

Regenerating is the form's action, so it runs through `ActionForm` like any other submit: the button shows the inline spinner while in flight, and the success handler swaps the list for the new codes and raises a toast.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live · device enrolled. Copy All flips its label; Generate replaces the list and toasts.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewRecoveryCodes.vue')" :state="MFA_ENROLLED" route-name="welcome" :mocks="recoveryCodesAccepts" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>list: <code>ViewRecoveryCodes.listItem</code> is a <code>grid-cols-[22px_1fr]</code> row, so every code aligns on one baseline whatever the index width</span>
    <span>codes are mono at 14px with a letter-spacing bump so a dashed code reads as machine-input</span>
    <span>the warning above the list is a real <code>Alert variant="warning"</code>, not a hand-toned strip</span>
    <span>saving controls are outline buttons at <code>size="sm"</code>; Copy All swaps to "Copied!" from <code>useClipboard</code></span>
    <span>theme keys: <code>AuthForm</code>, <code>ActionForm</code>, <code>ViewRecoveryCodes</code> · source: <code>ViewRecoveryCodes.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live · no device enrolled. The codes panel and its action bar are both withheld.</header>
  <AuthDemo :view="() => import('@vueda/views/ViewRecoveryCodes.vue')" :state="LOGGED_IN" route-name="welcome" :mocks="recoveryCodesAccepts" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>the gate is <code>loggedInUser.totp_devices</code>, so the view never shows an empty list where codes would go</span>
    <span>the action bar is withheld too: there is nothing to regenerate until a device exists</span>
  </footer>
</VuedaDemo>
</ClientOnly>

### Design proposal: mark redeemed codes

Not shipped. The card below is a proposal, not a rendering of the default theme. It keeps every code listed for transparency and strikes through the ones already redeemed, so the remaining count is readable at a glance instead of inferred.

It is blocked on the server: the recovery-codes endpoint returns unused codes only, so the client has nothing to mark. Once used codes are exposed, the realized shape is a `data-used="true"` variant on {@api theme-key:ViewRecoveryCodes.listItem} rather than the hand-authored row below.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proposal · hand-authored. 3 of 8 redeemed.</header>
  <div class="flex flex-col gap-3 rounded-vueda-card hairline hairline-border bg-background p-6">
    <strong>Unused Recovery codes:</strong>
    <ol class="grid grid-cols-2 gap-x-6 gap-y-1 rounded-vueda-control hairline hairline-border bg-muted/10 p-3">
      <li class="flex items-center gap-2 font-mono text-sm text-muted-foreground line-through"><span class="w-4 shrink-0 text-right text-xs">1.</span>rt3m-9kdq-pzn4</li>
      <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">2.</span>4j2s-bvxm-twc8</li>
      <li class="flex items-center gap-2 font-mono text-sm text-muted-foreground line-through"><span class="w-4 shrink-0 text-right text-xs">3.</span>h8nq-zd7r-yfa1</li>
      <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">4.</span>m6kx-3pw2-l9eu</li>
      <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">5.</span>cr5v-jbn4-xaw7</li>
      <li class="flex items-center gap-2 font-mono text-sm text-muted-foreground line-through"><span class="w-4 shrink-0 text-right text-xs">6.</span>q1zd-ph8t-ekm3</li>
      <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">7.</span>w0fy-72ng-srt6</li>
      <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">8.</span>xb9c-uea4-vhk2</li>
    </ol>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>redeemed rows: <code>text-muted-foreground line-through</code>; the index loses its own muted tone so the whole row reads as one struck unit</span>
    <span>the live list uses a 22px index column; this proposal predates that and uses <code>w-4</code>, so the realized version inherits the live grid</span>
  </footer>
</VuedaDemo>

## Customization surface

AuthForm and AuthorizingForm expose dedicated theme keys. All inner form content uses the same tokens and theme keys as the Forms family.

| Surface                       | Key tokens / theme keys                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| AuthForm outer container      | `AuthForm` theme key · `theme.outer` controls width constraint                                    |
| AuthorizingForm centering     | `AuthorizingForm` theme key · `theme.root` controls full-viewport centering                       |
| Auth card background          | `--card` via `bg-card`                                                                            |
| Auth card border              | `--border` via `border-border`                                                                    |
| Auth card radius              | `--radius-vueda-card` via `rounded-vueda-card`                                                    |
| Field shell and input chrome  | `Field`, `FieldLabel`, `FieldContent`, `Input`, `InputOTP`, `InputOTPSlot` — same as Forms family |
| OTP slot active highlight     | `InputOTPSlot` theme key · `data-active` attribute drives focus ring                              |
| Method picker selected card   | `--primary` via `border-primary bg-primary/5`                                                     |
| Step indicator active         | `--primary` via `bg-primary border-primary text-primary-foreground`                               |
| Step indicator done           | `--success` via `bg-success`; `text-success-foreground` for the checkmark                         |
| Step connector active-to-done | `--primary` via `bg-primary`                                                                      |
| Step connector pending        | `--border` via `bg-border`                                                                        |
| Recovery code grid            | `--muted`, `--border` — same bordered content block as other panels                               |
| Used code style               | `text-muted-foreground line-through`                                                              |
| Alert tones                   | `Alert` theme key · `variant` prop: `warning`, `destructive`, `info`, `success`, `default`        |
