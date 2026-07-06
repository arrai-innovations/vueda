---
title: Auth & MFA Views
status: draft
audience: designer
type: reference
---

<script setup>
import PageTitle from "@vueda/shell/page-title/PageTitle.vue";
import Button from "@vueda/controls/button/Button.vue";
import Input from "@vueda/controls/input/Input.vue";
import Field from "@vueda/shell/field/Field.vue";
import FieldContent from "@vueda/shell/field/FieldContent.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldLabel from "@vueda/shell/field/FieldLabel.vue";
import FieldMessage from "@vueda/shell/field/FieldMessage.vue";
import Alert from "@vueda/feedback/alert/Alert.vue";
import AlertTitle from "@vueda/feedback/alert/AlertTitle.vue";
import AlertDescription from "@vueda/feedback/alert/AlertDescription.vue";
import InputOTP from "@vueda/controls/input-otp/InputOTP.vue";
import InputOTPGroup from "@vueda/controls/input-otp/InputOTPGroup.vue";
import InputOTPSlot from "@vueda/controls/input-otp/InputOTPSlot.vue";
import RadioGroup from "@vueda/controls/radio-group/RadioGroup.vue";
import RadioGroupItem from "@vueda/controls/radio-group/RadioGroupItem.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faShieldHalved,
  faTriangleExclamation,
  faCircleExclamation,
  faCircleInfo,
  faCheck,
  faCopy,
  faPrint,
  faRotate,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import {
  faClock,
  faMessage,
  faEnvelope,
  faFloppyDisk,
  faLifeRing,
} from "@fortawesome/free-regular-svg-icons";
import { ref } from "vue";
import { LOGGED_OUT, formError } from "../../.vitepress/theme/fixtures/authUser.js";

const tfaMethod = ref("totp");
const setupMethod = ref("totp");
const otpPartial = ref("4829");
const otpSmsPartial = ref("391");
const otpSetup = ref("298");

const signInAccepts = { login: (payload, store) => { store.loggedIn = true; } };
const signInRejects = { login: () => { throw formError({ non_field_errors: ["Incorrect email or password."] }); } };
</script>

# Auth & MFA Views

Four end-user-facing flows sharing one of two card recipes. **AuthForm** (`theme key: AuthForm`) renders a `PageTitle` at the page level then an `ActionForm` card below it, constrained to `max-w-3xl`. **AuthorizingForm** (`theme key: AuthorizingForm`) centers its card both horizontally and vertically — no `PageTitle`, the card is the whole screen.

Note: the demos below place the title inside the card so the layout is self-contained. In production, `AuthForm` renders `PageTitle` as a page-level sibling above the card, not inside it.

Token surface: `--card`, `--border`, `--muted-foreground`, `--ring`, `--destructive`, `--vueda-font-mono`.

## Chrome anatomy

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="AuthForm — column-aligned">
    <div class="flex flex-col gap-3">
      <div class="border-b border-dashed border-border pb-2 text-center text-xs text-muted-foreground">PageTitle (page-level sibling, not inside card)</div>
      <div class="flex flex-col gap-4 rounded-vueda-card border border-border bg-card p-5">
        <div>
          <p class="text-[15px] font-semibold leading-tight">Form title</p>
          <p class="mt-1 text-sm text-muted-foreground">Subtitle describing what the form does.</p>
        </div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">fields</div>
        <div class="flex gap-2">
          <Button size="sm" tone="primary">Primary action</Button>
          <Button size="sm" emphasis="ghost">Cancel</Button>
        </div>
      </div>
    </div>
    <template #footer>
      <span>theme key: <code>AuthForm</code> · <code>theme.outer</code> constrains to <code>max-w-3xl</code></span>
      <span>used by: ChangePassword, SetupDevice, RecoveryCodes</span>
    </template>
  </DemoCard>
  <DemoCard title="AuthorizingForm — centered">
    <div class="flex min-h-44 items-center justify-center rounded-vueda-card border border-dashed border-border bg-muted/10">
      <div class="flex w-60 flex-col gap-4 rounded-vueda-card border border-border bg-card p-5">
        <div>
          <p class="text-[15px] font-semibold leading-tight">Form title</p>
          <p class="mt-1 text-sm text-muted-foreground">No PageTitle. Card is the whole page.</p>
        </div>
        <div class="flex h-8 items-center justify-center rounded border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">fields</div>
        <Button size="sm" tone="primary">Verify</Button>
      </div>
    </div>
    <template #footer>
      <span>theme key: <code>AuthorizingForm</code> · <code>theme.root</code>: <code>flex min-h-svh justify-center items-center</code></span>
      <span>used by: TwoFactorAuth</span>
    </template>
  </DemoCard>
</VuedaDemo>

## SignIn

`ViewSignIn` is the default sign-in view: an email and password form in an `AuthorizingForm` card. Post-login routing and MFA pending-flow detection come from `AuthorizingForm` (via `useSignInFlow`); submission, loading, and server-side validation mapping come from the inner `ActionForm`. Unlike the cards above, these demos render the **live component** through the `AuthDemo` harness, so submitting exercises the real loading, toast, and error paths. The first demo hosts a single `Sonner`; because the toast store is global, every demo on this page surfaces its toasts through that one corner overlay, as in a real app.

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default · credentials accepted — submit to see the loading state then the "Signed In" success toast</header>
  <AuthDemo :view="() => import('@vueda/views/ViewSignIn.vue')" :state="LOGGED_OUT" route-name="sign-in" :mocks="signInAccepts" toasts />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>AuthorizingForm centers the card; <code>ViewSignIn</code> supplies the email and password fields plus a single "Sign In" submit</span>
    <span>theme key: <code>AuthorizingForm</code> · source: <code>ViewSignIn.vue</code></span>
  </footer>
</VuedaDemo>
</ClientOnly>

<ClientOnly>
<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invalid credentials — submit to see the form-scope error and the failure toast</header>
  <AuthDemo :view="() => import('@vueda/views/ViewSignIn.vue')" :state="LOGGED_OUT" route-name="sign-in" :mocks="signInRejects" />
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>a server <code>non_field_errors</code> response maps to the ActionForm form-scope error; <code>action-error-summary</code> drives the toast</span>
  </footer>
</VuedaDemo>
</ClientOnly>

## ChangePassword

Three password fields in an AuthForm card. Two states: ready to submit and confirm-field mismatch with a form-scope alert.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default · ready to submit — all three fields entered, primary enabled</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Change password">
      <template #subtitle>Pick a strong, unique password. You'll stay signed in on this device.</template>
    </PageTitle>
    <div class="flex max-w-md flex-col gap-4 px-6 py-5">
      <Field orientation="vertical">
        <FieldLabel for="cp-old">Your old password</FieldLabel>
        <FieldContent>
          <Input id="cp-old" type="password" model-value="••••••••••" />
        </FieldContent>
      </Field>
      <Field orientation="vertical">
        <FieldLabel for="cp-new">Your new password</FieldLabel>
        <FieldContent>
          <Input id="cp-new" type="password" model-value="••••••••••••••" />
          <FieldDescription>At least 12 characters. Don't reuse a password from another site.</FieldDescription>
        </FieldContent>
      </Field>
      <Field orientation="vertical">
        <FieldLabel for="cp-confirm">Confirm new password</FieldLabel>
        <FieldContent>
          <Input id="cp-confirm" type="password" model-value="••••••••••••••" />
        </FieldContent>
      </Field>
      <div class="flex gap-3 pt-1">
        <Button type="submit" tone="primary">Update password</Button>
        <Button emphasis="ghost">Cancel</Button>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>AuthForm chrome: card sits below PageTitle; content column uses <code>max-w-md</code> so the form never spans the full view width</span>
    <span>fields: Field + FieldLabel + FieldContent + Input — same primitives as all other forms</span>
    <span>theme keys: <code>AuthForm</code> · source: <code>ViewChangePassword.vue</code></span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Error · confirm mismatch — FieldMessage on invalid field + form-scope Alert above actions</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Change password">
      <template #subtitle>Pick a strong, unique password. You'll stay signed in on this device.</template>
    </PageTitle>
    <div class="flex max-w-md flex-col gap-4 px-6 py-5">
      <Field orientation="vertical">
        <FieldLabel for="cp-old-e">Your old password</FieldLabel>
        <FieldContent>
          <Input id="cp-old-e" type="password" model-value="••••••••••" />
        </FieldContent>
      </Field>
      <Field orientation="vertical">
        <FieldLabel for="cp-new-e">Your new password</FieldLabel>
        <FieldContent>
          <Input id="cp-new-e" type="password" model-value="••••••••••••••" />
        </FieldContent>
      </Field>
      <Field orientation="vertical">
        <FieldLabel for="cp-confirm-e">Confirm new password</FieldLabel>
        <FieldContent>
          <Input id="cp-confirm-e" type="password" model-value="••••••••••" aria-invalid="true" />
          <FieldMessage>Passwords don't match. Re-enter your new password.</FieldMessage>
        </FieldContent>
      </Field>
      <Alert variant="destructive">
        <FontAwesomeIcon :icon="faTriangleExclamation" />
        <AlertTitle>Could not update password</AlertTitle>
        <AlertDescription>Fix the field above and try again.</AlertDescription>
      </Alert>
      <div class="flex gap-3">
        <Button type="submit" tone="primary" disabled aria-disabled="true">Update password</Button>
        <Button emphasis="ghost">Cancel</Button>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>field error: FieldMessage inside FieldContent — inherits destructive tone from the theme key</span>
    <span>form alert: Alert variant="destructive" above the actions; provides a form-scope summary even when only one field is invalid</span>
    <span>primary disabled until the form is valid — submit guard is a form-level concern, not just UX decoration</span>
  </footer>
</VuedaDemo>

## TwoFactorAuth

AuthorizingForm layout. The user holds a session token but the server demands a second factor. Three states: TOTP code entry with interactive method picker, SMS cooldown, and the recovery code fallback path.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Method picker · TOTP selected — 3 verified methods, interactive picker; OTP entry below</header>
  <div class="flex items-center justify-center overflow-clip rounded-vueda-card border border-border bg-muted/10 px-4 py-10">
    <div class="flex w-full max-w-sm flex-col gap-5 rounded-vueda-card border border-border bg-card p-6">
      <div>
        <p class="text-[15px] font-semibold leading-tight">Two-factor authentication</p>
        <p class="mt-1 text-sm text-muted-foreground">Choose a verified method to confirm it's you.</p>
      </div>
      <div class="flex flex-col gap-4">
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
                <span class="text-[11px] leading-tight text-muted-foreground">j@arrai.com</span>
              </div>
            </RadioGroup>
          </FieldContent>
        </Field>
        <Field orientation="vertical">
          <FieldLabel for="tfa-code">Code</FieldLabel>
          <FieldContent>
            <InputOTP v-model="otpPartial" :max-length="6">
              <InputOTPGroup>
                <InputOTPSlot :index="0" />
                <InputOTPSlot :index="1" />
                <InputOTPSlot :index="2" />
                <InputOTPSlot :index="3" />
                <InputOTPSlot :index="4" />
                <InputOTPSlot :index="5" />
              </InputOTPGroup>
            </InputOTP>
            <FieldDescription>Enter the 6-digit code from your authenticator app.</FieldDescription>
          </FieldContent>
        </Field>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button tone="primary">Verify</Button>
        <Button emphasis="ghost">
          <FontAwesomeIcon :icon="faLifeRing" />
          Use a recovery code
        </Button>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>AuthorizingForm: outer container <code>flex min-h-full items-center justify-center</code>; card <code>max-w-sm</code>, no PageTitle</span>
    <span>method picker: RadioGroup v-model + 3-col grid of option cards; selected: <code>border-primary bg-primary/5</code>; click wrapper to select whole card</span>
    <span>OTP: InputOTP + InputOTPGroup + 6 × InputOTPSlot; theme keys: <code>InputOTP</code>, <code>InputOTPSlot</code></span>
    <span>source uses a dropdown for method selection; segmented picker is a design proposal — the grid reads as a first-class decision on screen</span>
    <span>theme key: <code>AuthorizingForm</code> · source: <code>ViewTwoFactorAuth.vue</code></span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SMS · cooldown active — code dispatched, resend disabled; masked destination in subtitle</header>
  <div class="flex items-center justify-center overflow-clip rounded-vueda-card border border-border bg-muted/10 px-4 py-10">
    <div class="flex w-full max-w-sm flex-col gap-5 rounded-vueda-card border border-border bg-card p-6">
      <div>
        <p class="text-[15px] font-semibold leading-tight">Enter your code</p>
        <p class="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to <strong>(•••) ••• 0413</strong>. It expires in 5 minutes.</p>
      </div>
      <Field orientation="vertical">
        <FieldLabel for="tfa-sms-code">Verification code</FieldLabel>
        <FieldContent>
          <InputOTP v-model="otpSmsPartial" :max-length="6">
            <InputOTPGroup>
              <InputOTPSlot :index="0" />
              <InputOTPSlot :index="1" />
              <InputOTPSlot :index="2" />
              <InputOTPSlot :index="3" />
              <InputOTPSlot :index="4" />
              <InputOTPSlot :index="5" />
            </InputOTPGroup>
          </InputOTP>
        </FieldContent>
      </Field>
      <div class="flex flex-wrap gap-2">
        <Button tone="primary" disabled aria-disabled="true">Verify</Button>
        <Button emphasis="ghost" disabled aria-disabled="true">
          <FontAwesomeIcon :icon="faClock" />
          Send sms again
          <span class="rounded border border-border bg-muted/40 px-1 font-mono text-xs">0:47</span>
        </Button>
        <Button emphasis="ghost">
          <FontAwesomeIcon :icon="faLifeRing" />
          Use a recovery code
        </Button>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>cooldown: resend button disabled with an inline mono countdown chip — state is visual, not just textual</span>
    <span>cooldown chip: <code>rounded border border-border bg-muted/40 px-1 font-mono text-xs</code></span>
    <span>primary disabled until all 6 slots are filled; destination masked to last 4 digits</span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recovery code path — single text input with mono style; back link to verified methods</header>
  <div class="flex items-center justify-center overflow-clip rounded-vueda-card border border-border bg-muted/10 px-4 py-10">
    <div class="flex w-full max-w-sm flex-col gap-5 rounded-vueda-card border border-border bg-card p-6">
      <div>
        <p class="text-[15px] font-semibold leading-tight">Use a recovery code</p>
        <p class="mt-1 text-sm text-muted-foreground">Enter one of the codes you saved when you set up two-factor auth. Each code works once.</p>
      </div>
      <Field orientation="vertical">
        <FieldLabel for="tfa-rc">Recovery code</FieldLabel>
        <FieldContent>
          <Input id="tfa-rc" type="text" model-value="rt3m-9kdq-pzn4" class="font-mono tracking-wide" />
        </FieldContent>
      </Field>
      <div class="flex gap-2">
        <Button tone="primary">Verify</Button>
        <Button emphasis="ghost">
          <FontAwesomeIcon :icon="faArrowLeft" />
          Back to verified methods
        </Button>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>plain Input with <code>font-mono tracking-wide</code> — matches how codes are printed; replaces the OTP grid since codes are free-text</span>
    <span>back navigates to the method picker, not the sign-in page</span>
  </footer>
</VuedaDemo>

## SetupDevice

A three-step flow inside an AuthForm card. A step indicator track sits above the card content showing progress through Choose, Verify, and Done. Three states shown: choose method, verify TOTP (QR + inline manual key), and verify SMS.

Source (`ViewSetupDevice.vue`) advances by mutating `currentStep` with no visible step track. The step indicator is a design addition. Use the `Stepper` family (`Stepper`, `StepperItem`, `StepperIndicator`, `StepperTitle`, `StepperSeparator`) for the production implementation.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 1 · Choose method — interactive picker; email option disabled (no verified address)</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Set up a verification device">
      <template #subtitle>Pick how you want to receive verification codes when signing in.</template>
      <template #button>
        <Button size="sm" emphasis="ghost">Cancel</Button>
      </template>
    </PageTitle>
    <div class="flex max-w-md flex-col gap-5 px-6 py-5">
      <!-- step track -->
      <div class="flex items-start">
        <div class="flex flex-col items-center gap-1">
          <div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-primary text-xs font-semibold text-primary-foreground">1</div>
          <span class="text-xs font-semibold text-foreground">Choose</span>
        </div>
        <div class="mt-3 h-px flex-1 bg-border"></div>
        <div class="flex flex-col items-center gap-1">
          <div class="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground">2</div>
          <span class="text-xs text-muted-foreground">Verify</span>
        </div>
        <div class="mt-3 h-px flex-1 bg-border"></div>
        <div class="flex flex-col items-center gap-1">
          <div class="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground">3</div>
          <span class="text-xs text-muted-foreground">Done</span>
        </div>
      </div>
      <!-- method picker -->
      <Field orientation="vertical">
        <FieldLabel>Method</FieldLabel>
        <FieldContent>
          <RadioGroup v-model="setupMethod" class="grid grid-cols-3 gap-2">
            <div :class="setupMethod === 'totp' ? 'border-primary bg-primary/5' : 'border-border bg-card'" class="flex cursor-pointer flex-col items-center gap-1.5 rounded-vueda-control border p-3 text-center transition-colors" @click="setupMethod = 'totp'">
              <RadioGroupItem id="sd-totp" value="totp" class="sr-only" />
              <FontAwesomeIcon :icon="faClock" class="text-sm text-muted-foreground" />
              <span class="text-xs font-semibold leading-tight">Authenticator app</span>
              <span class="text-[11px] leading-tight text-muted-foreground">TOTP · recommended</span>
            </div>
            <div :class="setupMethod === 'sms' ? 'border-primary bg-primary/5' : 'border-border bg-card'" class="flex cursor-pointer flex-col items-center gap-1.5 rounded-vueda-control border p-3 text-center transition-colors" @click="setupMethod = 'sms'">
              <RadioGroupItem id="sd-sms" value="sms" class="sr-only" />
              <FontAwesomeIcon :icon="faMessage" class="text-sm text-muted-foreground" />
              <span class="text-xs font-semibold leading-tight">SMS</span>
              <span class="text-[11px] leading-tight text-muted-foreground">Phone number</span>
            </div>
            <div class="flex cursor-not-allowed flex-col items-center gap-1.5 rounded-vueda-control border border-border bg-card p-3 text-center opacity-50">
              <RadioGroupItem id="sd-email" value="email" :disabled="true" class="sr-only" />
              <FontAwesomeIcon :icon="faEnvelope" class="text-sm text-muted-foreground" />
              <span class="text-xs font-semibold leading-tight">Email</span>
              <span class="text-[11px] leading-tight text-muted-foreground">No verified address</span>
            </div>
          </RadioGroup>
          <FieldDescription>You can add another method later from your security settings.</FieldDescription>
        </FieldContent>
      </Field>
      <div class="flex gap-3">
        <Button tone="primary">Continue</Button>
        <Button emphasis="ghost">Cancel</Button>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>active step: <code>bg-primary border-primary text-primary-foreground</code> filled circle</span>
    <span>inactive step: <code>border-border bg-card text-muted-foreground</code> hollow circle</span>
    <span>disabled option: <code>opacity-50 cursor-not-allowed</code> on wrapper; <code>:disabled="true"</code> on RadioGroupItem</span>
    <span>step track implementation: Stepper + StepperItem + StepperIndicator + StepperTitle + StepperSeparator</span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 2 · Verify TOTP — step 1 done; QR placeholder + inline manual key; OTP entry</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Verify your authenticator">
      <template #subtitle>Scan this code with 1Password, Authy, or any TOTP app.</template>
      <template #button>
        <Button size="sm" emphasis="ghost">Cancel</Button>
      </template>
    </PageTitle>
    <div class="flex max-w-md flex-col gap-5 px-6 py-5">
      <!-- step track: step 1 done -->
      <div class="flex items-start">
        <div class="flex flex-col items-center gap-1">
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-success text-xs font-semibold text-white">
            <FontAwesomeIcon :icon="faCheck" class="text-[10px]" />
          </div>
          <span class="text-xs text-muted-foreground">Choose</span>
        </div>
        <div class="mt-3 h-px flex-1 bg-primary"></div>
        <div class="flex flex-col items-center gap-1">
          <div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-primary text-xs font-semibold text-primary-foreground">2</div>
          <span class="text-xs font-semibold text-foreground">Verify</span>
        </div>
        <div class="mt-3 h-px flex-1 bg-border"></div>
        <div class="flex flex-col items-center gap-1">
          <div class="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground">3</div>
          <span class="text-xs text-muted-foreground">Done</span>
        </div>
      </div>
      <!-- QR + manual key -->
      <Field orientation="vertical">
        <FieldLabel>Setup code</FieldLabel>
        <FieldContent>
          <div class="flex gap-4 rounded-vueda-control border border-border bg-muted/10 p-3">
            <div class="shrink-0">
              <svg viewBox="0 0 80 80" class="h-20 w-20" aria-label="QR code placeholder">
                <rect width="80" height="80" fill="white" />
                <g fill="#0a0a0a">
                  <rect x="4" y="4" width="20" height="20" />
                  <rect x="8" y="8" width="12" height="12" fill="white" />
                  <rect x="10" y="10" width="6" height="6" />
                  <rect x="56" y="4" width="20" height="20" />
                  <rect x="60" y="8" width="12" height="12" fill="white" />
                  <rect x="62" y="10" width="6" height="6" />
                  <rect x="4" y="56" width="20" height="20" />
                  <rect x="8" y="60" width="12" height="12" fill="white" />
                  <rect x="10" y="62" width="6" height="6" />
                  <rect x="28" y="4" width="4" height="4" /><rect x="36" y="4" width="4" height="4" /><rect x="44" y="4" width="4" height="4" />
                  <rect x="28" y="12" width="4" height="4" /><rect x="40" y="12" width="4" height="4" />
                  <rect x="32" y="20" width="4" height="4" /><rect x="44" y="20" width="4" height="4" />
                  <rect x="28" y="28" width="4" height="4" /><rect x="36" y="28" width="4" height="4" /><rect x="52" y="28" width="4" height="4" />
                  <rect x="4" y="32" width="4" height="4" /><rect x="16" y="32" width="4" height="4" /><rect x="28" y="32" width="4" height="4" /><rect x="40" y="32" width="4" height="4" />
                  <rect x="8" y="40" width="4" height="4" /><rect x="28" y="40" width="4" height="4" /><rect x="44" y="40" width="4" height="4" />
                  <rect x="28" y="48" width="4" height="4" /><rect x="36" y="48" width="4" height="4" /><rect x="52" y="48" width="4" height="4" />
                  <rect x="28" y="56" width="4" height="4" /><rect x="40" y="56" width="4" height="4" />
                  <rect x="28" y="64" width="4" height="4" /><rect x="36" y="64" width="4" height="4" /><rect x="48" y="64" width="4" height="4" />
                </g>
              </svg>
            </div>
            <div class="flex min-w-0 flex-col justify-center gap-2">
              <p class="text-sm font-semibold">Scan to add</p>
              <p class="text-xs text-muted-foreground">Or enter the manual key below if you can't scan.</p>
              <div class="flex items-center gap-1.5 rounded border border-border bg-muted/20 px-2 py-1">
                <span class="text-xs text-muted-foreground">Key</span>
                <span class="flex-1 truncate font-mono text-xs tracking-wide">JBSWY3DP-EHPK3PXP</span>
                <Button size="sm" emphasis="ghost" class="h-5 w-5 shrink-0 p-0" aria-label="Copy manual key">
                  <FontAwesomeIcon :icon="faCopy" class="text-xs" />
                </Button>
              </div>
            </div>
          </div>
        </FieldContent>
      </Field>
      <!-- OTP entry -->
      <Field orientation="vertical">
        <FieldLabel for="sd-totp-code">Enter the 6-digit code from your app</FieldLabel>
        <FieldContent>
          <InputOTP v-model="otpSetup" :max-length="6">
            <InputOTPGroup>
              <InputOTPSlot :index="0" />
              <InputOTPSlot :index="1" />
              <InputOTPSlot :index="2" />
              <InputOTPSlot :index="3" />
              <InputOTPSlot :index="4" />
              <InputOTPSlot :index="5" />
            </InputOTPGroup>
          </InputOTP>
        </FieldContent>
      </Field>
      <div class="flex gap-3">
        <Button tone="primary" disabled aria-disabled="true">Verify and finish</Button>
        <Button emphasis="ghost">
          <FontAwesomeIcon :icon="faArrowLeft" />
          Back
        </Button>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>done step: <code>bg-success text-white</code> filled circle with checkmark; connector between done and active steps: <code>bg-primary</code></span>
    <span>manual key inline: short content fits below the QR without a dialog — removes a click; source hides it behind a sheet</span>
    <span>QR is a placeholder SVG; real implementation renders a PNG from the server</span>
    <span>primary disabled until all 6 slots filled</span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 2 · Verify SMS — code dispatched; OTP entry; cooldown on resend; back to change number</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Verify your phone">
      <template #subtitle>We sent a code to +1 (415) 555-0413. It expires in 5 minutes.</template>
      <template #button>
        <Button size="sm" emphasis="ghost">Cancel</Button>
      </template>
    </PageTitle>
    <div class="flex max-w-md flex-col gap-5 px-6 py-5">
      <!-- step track: step 1 done -->
      <div class="flex items-start">
        <div class="flex flex-col items-center gap-1">
          <div class="flex h-6 w-6 items-center justify-center rounded-full bg-success text-xs font-semibold text-white">
            <FontAwesomeIcon :icon="faCheck" class="text-[10px]" />
          </div>
          <span class="text-xs text-muted-foreground">Choose</span>
        </div>
        <div class="mt-3 h-px flex-1 bg-primary"></div>
        <div class="flex flex-col items-center gap-1">
          <div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-primary text-xs font-semibold text-primary-foreground">2</div>
          <span class="text-xs font-semibold text-foreground">Verify</span>
        </div>
        <div class="mt-3 h-px flex-1 bg-border"></div>
        <div class="flex flex-col items-center gap-1">
          <div class="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-muted-foreground">3</div>
          <span class="text-xs text-muted-foreground">Done</span>
        </div>
      </div>
      <Field orientation="vertical">
        <FieldLabel for="sd-sms-code">Verification code</FieldLabel>
        <FieldContent>
          <InputOTP :max-length="6">
            <InputOTPGroup>
              <InputOTPSlot :index="0" />
              <InputOTPSlot :index="1" />
              <InputOTPSlot :index="2" />
              <InputOTPSlot :index="3" />
              <InputOTPSlot :index="4" />
              <InputOTPSlot :index="5" />
            </InputOTPGroup>
          </InputOTP>
        </FieldContent>
      </Field>
      <div class="flex flex-wrap gap-2">
        <Button tone="primary" disabled aria-disabled="true">Verify and finish</Button>
        <Button emphasis="ghost" disabled aria-disabled="true">
          <FontAwesomeIcon :icon="faClock" />
          Send sms again
          <span class="rounded border border-border bg-muted/40 px-1 font-mono text-xs">0:32</span>
        </Button>
        <Button emphasis="ghost">
          <FontAwesomeIcon :icon="faArrowLeft" />
          Change number
        </Button>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>subtitle carries destination and expiry — no inline field needed for "where was it sent"</span>
    <span>cooldown chip same pattern as TwoFactorAuth SMS demo above</span>
    <span>"Change number" escapes back one level without abandoning the full setup flow</span>
  </footer>
</VuedaDemo>

## RecoveryCodes

Three states: fresh set of 8 codes right after generation, a set with 3 of 8 already redeemed, and the empty state when no 2FA device is configured yet. Uses AuthForm layout.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Default · 8 codes, none used — view right after generation; saving options as outline buttons</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Recovery codes" />
    <div class="flex max-w-md flex-col gap-5 px-6 py-5">
      <p class="text-sm text-muted-foreground">Save these somewhere safe. You can use any of them in place of a verification code if you lose your device.</p>
      <Alert variant="warning">
        <FontAwesomeIcon :icon="faCircleExclamation" />
        <AlertTitle>Each code works once</AlertTitle>
        <AlertDescription>After you use a code it becomes invalid. Generate a new set if you run low or think someone else has seen them.</AlertDescription>
      </Alert>
      <ol class="grid grid-cols-2 gap-x-6 gap-y-1 rounded-vueda-control border border-border bg-muted/10 p-3">
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">1.</span>rt3m-9kdq-pzn4</li>
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">2.</span>4j2s-bvxm-twc8</li>
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">3.</span>h8nq-zd7r-yfa1</li>
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">4.</span>m6kx-3pw2-l9eu</li>
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">5.</span>cr5v-jbn4-xaw7</li>
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">6.</span>q1zd-ph8t-ekm3</li>
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">7.</span>w0fy-72ng-srt6</li>
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">8.</span>xb9c-uea4-vhk2</li>
      </ol>
      <div class="flex flex-wrap gap-2">
        <Button emphasis="outline">
          <FontAwesomeIcon :icon="faFloppyDisk" />
          Download .txt
        </Button>
        <Button emphasis="outline">
          <FontAwesomeIcon :icon="faPrint" />
          Print
        </Button>
        <Button emphasis="outline">
          <FontAwesomeIcon :icon="faCopy" />
          Copy all
        </Button>
      </div>
      <div class="flex items-start justify-between gap-3 rounded-vueda-control border border-border p-3">
        <p class="text-sm text-muted-foreground"><strong class="text-foreground">Need a new set?</strong> Regenerating invalidates these codes immediately. You'll need somewhere safe to put the new ones.</p>
        <Button emphasis="ghost" class="shrink-0">
          <FontAwesomeIcon :icon="faRotate" />
          Generate new codes
        </Button>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>code grid: <code>grid grid-cols-2</code> with <code>font-mono</code> — 2-column layout is deterministic regardless of code length or font swap</span>
    <span>saving options: outline buttons (not ghost) — equal weight signals these are the primary saving actions before confirming</span>
    <span>regenerate strip: bordered inline block with warning copy; below the saving actions so it reads as secondary</span>
    <span>theme key: <code>AuthForm</code> · source: <code>ViewRecoveryCodes.vue</code></span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">In-use · 3 of 8 redeemed — used codes struck through and muted; 5 remaining; regenerate escalates to primary</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Recovery codes">
      <template #subtitle>5 codes remaining. We'll prompt you to regenerate at 2.</template>
    </PageTitle>
    <div class="flex max-w-md flex-col gap-5 px-6 py-5">
      <ol class="grid grid-cols-2 gap-x-6 gap-y-1 rounded-vueda-control border border-border bg-muted/10 p-3">
        <li class="flex items-center gap-2 font-mono text-sm text-muted-foreground line-through"><span class="w-4 shrink-0 text-right text-xs">1.</span>rt3m-9kdq-pzn4</li>
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">2.</span>4j2s-bvxm-twc8</li>
        <li class="flex items-center gap-2 font-mono text-sm text-muted-foreground line-through"><span class="w-4 shrink-0 text-right text-xs">3.</span>h8nq-zd7r-yfa1</li>
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">4.</span>m6kx-3pw2-l9eu</li>
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">5.</span>cr5v-jbn4-xaw7</li>
        <li class="flex items-center gap-2 font-mono text-sm text-muted-foreground line-through"><span class="w-4 shrink-0 text-right text-xs">6.</span>q1zd-ph8t-ekm3</li>
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">7.</span>w0fy-72ng-srt6</li>
        <li class="flex items-center gap-2 font-mono text-sm"><span class="w-4 shrink-0 text-right text-xs text-muted-foreground">8.</span>xb9c-uea4-vhk2</li>
      </ol>
      <div class="flex items-start justify-between gap-3 rounded-vueda-control border border-border p-3">
        <p class="text-sm text-muted-foreground"><strong class="text-foreground">Generate a fresh set</strong> The codes above stop working as soon as you do. Print or download the new ones immediately.</p>
        <Button tone="primary" class="shrink-0">
          <FontAwesomeIcon :icon="faRotate" />
          Generate new codes
        </Button>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>used codes: <code>text-muted-foreground line-through</code> — still listed for transparency; shows which were consumed</span>
    <span>regenerate escalates from ghost to primary when codes are running low</span>
    <span>subtitle carries the count and threshold — surface the number before the user has to count themselves</span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empty · no 2FA configured — Alert + concrete CTA; source only shows Alert</header>
  <div class="rounded-vueda-card border border-border bg-card overflow-clip">
    <PageTitle title="Recovery codes" />
    <div class="flex max-w-md flex-col gap-5 px-6 py-5">
      <p class="text-sm text-muted-foreground">Recovery codes are an emergency fallback for when you lose access to your two-factor device.</p>
      <Alert variant="warning">
        <FontAwesomeIcon :icon="faCircleInfo" />
        <AlertTitle>Set up two-factor first</AlertTitle>
        <AlertDescription>You'll be able to generate recovery codes once you have at least one verified device on your account.</AlertDescription>
      </Alert>
      <div class="flex gap-3">
        <Button tone="primary">
          <FontAwesomeIcon :icon="faShieldHalved" />
          Set up a device
        </Button>
        <Button emphasis="ghost">Learn more about recovery codes</Button>
      </div>
    </div>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>empty state always offers the next concrete action — Alert alone leaves the user to navigate back on their own</span>
    <span>Alert variant="warning" with info icon: the situation isn't broken, just incomplete — warning tone signals action needed</span>
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
| Step indicator done           | `--success` via `bg-success`; `text-white` for the checkmark                                      |
| Step connector active-to-done | `--primary` via `bg-primary`                                                                      |
| Step connector pending        | `--border` via `bg-border`                                                                        |
| Recovery code grid            | `--muted`, `--border` — same bordered content block as other panels                               |
| Used code style               | `text-muted-foreground line-through`                                                              |
| Alert tones                   | `Alert` theme key · `variant` prop: `warning`, `destructive`, `info`, `success`, `default`        |
