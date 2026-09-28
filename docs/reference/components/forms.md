---
title: Forms
status: brainstorming
audience: designer
type: reference
---

<script setup>
import FieldSetMany from "@vueda/form/field-set/FieldSetMany.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import Field from "@vueda/shell/field/Field.vue";
import FieldContent from "@vueda/shell/field/FieldContent.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldGroup from "@vueda/shell/field/FieldGroup.vue";
import FieldLabel from "@vueda/shell/field/FieldLabel.vue";
import FieldMessage from "@vueda/shell/field/FieldMessage.vue";
import Alert from "@vueda/feedback/alert/Alert.vue";
import AlertDescription from "@vueda/feedback/alert/AlertDescription.vue";
import AlertTitle from "@vueda/feedback/alert/AlertTitle.vue";
import Input from "@vueda/controls/input/Input.vue";
import NativeSelect from "@vueda/controls/native-select/NativeSelect.vue";
import NativeSelectOption from "@vueda/controls/native-select/NativeSelectOption.vue";
import Checkbox from "@vueda/controls/checkbox/Checkbox.vue";
import Button from "@vueda/controls/button/Button.vue";
import Label from "@vueda/shell/label/Label.vue";
import InputOTP from "@vueda/controls/input-otp/InputOTP.vue";
import InputOTPGroup from "@vueda/controls/input-otp/InputOTPGroup.vue";
import InputOTPSlot from "@vueda/controls/input-otp/InputOTPSlot.vue";
import InputOTPSeparator from "@vueda/controls/input-otp/InputOTPSeparator.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faCircleExclamation,
  faCircleNotch,
  faCheck,
  faPaperPlane,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { faMicrosoft } from "@fortawesome/free-brands-svg-icons";
import { ref } from "vue";

const remember = ref(false);
const notificationEmails = ref(["orders@example.com", "accounts@example.com"]);
</script>

# Forms

This page shows the field shell, field and form feedback, and form layouts in the default theme. [Components](./index.md) describes the rules every component page shares.

## Field shell

{@api vue:component:Field} is the layout container for one field. It holds a {@api vue:component:FieldLabel} and a {@api vue:component:FieldContent} column. The column stacks the control, an optional {@api vue:component:FieldDescription}, and any {@api vue:component:FieldMessage}. {@api vue:component:FieldGroup} stacks several fields with even spacing.

The [`orientation`]{@api vue:component:Field:prop:orientation} prop sets the layout:

| Value                | Layout                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `vertical` (default) | Label above the content column.                                                                                                           |
| `horizontal`         | Label beside the content column. The label width is capped so the content keeps room.                                                     |
| `responsive`         | Vertical in a narrow `FieldGroup`, horizontal in a wide one. It needs a `FieldGroup` ancestor, because it responds to that group's width. |

{@api vue:component:FormField}, the default {@term Form Field}, builds this shell from the field's label, help text, and messages. While the field's widget is disabled, `FormField` sets `data-disabled="true"` on the `Field`, and the label dims. For a required field it appends an asterisk to the label, hidden from assistive technology. The asterisk is part of `FormField`'s markup, so no theme key reaches it. To change the indicator, replace the label through the [`field(<name>)label`]{@api vue:component:FormField:slot:field(fieldName)label} slot, which receives `label` and `required`. The demo composes its chip and "optional" markers that way.

Theme keys: {@api theme-key:Field}, {@api theme-key:FieldLabel}, {@api theme-key:FieldContent}, {@api theme-key:FieldDescription}, {@api theme-key:FieldGroup}.

<VuedaDemo class="grid gap-6 lg:grid-cols-3">
  <DemoCard title="vertical (default) · label above">
    <FieldGroup>
      <Field orientation="vertical">
        <FieldLabel for="anat-v">
          Display name
          <span aria-hidden="true" class="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Input id="anat-v" placeholder="Granger Holdings" />
          <FieldDescription>Shown on invoices and the customer portal.</FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  </DemoCard>
  <DemoCard title="horizontal · label beside content">
    <FieldGroup>
      <Field orientation="horizontal">
        <FieldLabel for="anat-h">
          Display name
          <span aria-hidden="true" class="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Input id="anat-h" placeholder="Granger Holdings" />
          <FieldDescription>Shown on invoices and the customer portal.</FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  </DemoCard>
  <DemoCard title="responsive · vertical when narrow, horizontal when wide">
    <FieldGroup>
      <Field orientation="responsive">
        <FieldLabel for="anat-r">Display name</FieldLabel>
        <FieldContent>
          <Input id="anat-r" model-value="Granger Holdings" />
          <FieldDescription>Switches layout with the width of the enclosing <code>FieldGroup</code>.</FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  </DemoCard>
  <DemoCard title="required indicators · asterisk, chip, optional marker" class="lg:col-span-2">
    <FieldGroup class="gap-4">
      <Field>
        <FieldLabel for="req-a">
          Email
          <span aria-hidden="true" class="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Input id="req-a" type="email" placeholder="ar@granger.example" />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel for="req-b">
          Email
          <span class="rounded-vueda-control hairline hairline-border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Required</span>
        </FieldLabel>
        <FieldContent>
          <Input id="req-b" type="email" placeholder="ar@granger.example" />
        </FieldContent>
      </Field>
      <Field>
        <FieldLabel for="req-c">
          Email
          <span class="font-normal text-muted-foreground">(optional)</span>
        </FieldLabel>
        <FieldContent>
          <Input id="req-c" type="email" placeholder="ar@granger.example" />
        </FieldContent>
      </Field>
    </FieldGroup>
    <template #footer>
      <span><code>FormField</code> renders the asterisk; the chip and optional marker replace the label slot</span>
    </template>
  </DemoCard>
  <DemoCard title="disabled control">
    <FieldGroup>
      <Field>
        <FieldLabel for="dis-a">Customer code</FieldLabel>
        <FieldContent>
          <Input id="dis-a" model-value="GRG-0042" disabled />
          <FieldDescription>Set automatically when the record was created.</FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  </DemoCard>
</VuedaDemo>

## Field feedback

`FieldMessage` shows a field's messages below the control. Its [`severity`]{@api vue:component:FieldMessage:prop:severity} prop sets the color and the ARIA role:

| `severity`        | Color                        | Role     |
| ----------------- | ---------------------------- | -------- |
| `error` (default) | {@api css-token:destructive} | `alert`  |
| `warning`         | {@api css-token:warning}     | `status` |

The [`messages`]{@api vue:component:FieldMessage:prop:messages} prop takes strings, arrays of strings, or objects with a `message` property. `FieldMessage` drops duplicates. One message renders as text; several render as a list. With no messages, nothing renders.

`FormField` renders the field's errors, then its warnings, each through a `FieldMessage`. The control carries its own state line. `aria-invalid="true"` on the input marks the line invalid, and `data-warning="true"` marks it as a warning; an invalid state outranks a warning. [Inputs](./inputs.md) shows the focus, disabled, and read-only states of the input shell. The valid and loading cards below are compositions: `FormField` renders no valid or pending indicator.

Two `FormField` props remove parts of the shell:

- [`hideLabel`]{@api vue:component:FormField:prop:hideLabel} drops the label. Help text, errors, and warnings still render below the control. {@api vue:component:FieldSetTabularInline} sets it, because its column headers (or card headers on narrow screens) name each field.
- [`hidden`]{@api vue:component:FormField:prop:hidden} renders the widget alone, with no label, help text, or messages. {@api vue:component:ActionForm} lists that field's errors in its validation summary.

VUEDA ships no compact feedback indicator for tight layouts. The theme registry has a {@api theme-key:FormHiddenFeedback} key, but no component reads it, so its values have no visible effect.

Theme keys: {@api theme-key:FieldMessage}, {@api theme-key:Input}.

<VuedaDemo class="grid gap-6 lg:grid-cols-3">
  <DemoCard title="default · untouched">
    <FieldGroup>
      <Field>
        <FieldLabel for="vs-default">Customer code</FieldLabel>
        <FieldContent>
          <Input id="vs-default" placeholder="GRG-0042" />
        </FieldContent>
      </Field>
    </FieldGroup>
  </DemoCard>
  <DemoCard title="focused">
    <FieldGroup>
      <Field>
        <FieldLabel>Customer code</FieldLabel>
        <FieldContent>
          <ForceState state="focus"><Input model-value="GRG-00" /></ForceState>
        </FieldContent>
      </Field>
    </FieldGroup>
  </DemoCard>
  <DemoCard title="filled / valid · trailing check">
    <FieldGroup>
      <Field>
        <FieldLabel>Customer code</FieldLabel>
        <FieldContent>
          <div class="relative">
            <Input model-value="GRG-0042" class="pr-8" />
            <span class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-success">
              <FontAwesomeIcon :icon="faCheck" class="text-xs" aria-label="Valid" />
            </span>
          </div>
        </FieldContent>
      </Field>
    </FieldGroup>
    <template #footer>
      <span>composition: <code>FormField</code> renders no valid indicator</span>
    </template>
  </DemoCard>
  <DemoCard title="error · single message">
    <FieldGroup>
      <Field>
        <FieldLabel for="vs-err1">
          Customer code
          <span aria-hidden="true" class="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Input id="vs-err1" model-value="grg" aria-invalid="true" />
          <FieldMessage :messages="['Customer code must be 8 characters and start with three uppercase letters.']" />
        </FieldContent>
      </Field>
    </FieldGroup>
    <template #footer>
      <span>one message renders as text</span>
      <span><code>aria-invalid</code> on the input marks the line invalid</span>
    </template>
  </DemoCard>
  <DemoCard title="error · multiple messages">
    <FieldGroup>
      <Field>
        <FieldLabel for="vs-err2">
          Password
          <span aria-hidden="true" class="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Input id="vs-err2" type="password" model-value="abc" aria-invalid="true" />
          <FieldMessage :messages="['Must be at least 12 characters.', 'Must contain a number and a symbol.', 'Must not match a previously used password.']" />
        </FieldContent>
      </Field>
    </FieldGroup>
    <template #footer>
      <span>several messages render as a list</span>
    </template>
  </DemoCard>
  <DemoCard title="warning · non-blocking">
    <FieldGroup>
      <Field>
        <FieldLabel for="vs-warn">Tax ID</FieldLabel>
        <FieldContent>
          <Input id="vs-warn" model-value="12-3456789" data-warning="true" />
          <FieldMessage severity="warning" :messages="['Format unfamiliar; saved as-is. Verify before posting invoices.']" />
        </FieldContent>
      </Field>
    </FieldGroup>
    <template #footer>
      <span><code>severity="warning"</code> sets the warning color and <code>role="status"</code></span>
      <span><code>data-warning</code> on the input marks the line; <code>aria-invalid</code> outranks it</span>
    </template>
  </DemoCard>
  <DemoCard title="disabled · non-editable">
    <FieldGroup>
      <Field>
        <FieldLabel for="vs-dis">Customer code</FieldLabel>
        <FieldContent>
          <Input id="vs-dis" model-value="GRG-0042" disabled />
          <FieldDescription>Set automatically when the record was created.</FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  </DemoCard>
  <DemoCard title="readonly · editable later">
    <FieldGroup>
      <Field>
        <FieldLabel for="vs-ro">Customer code</FieldLabel>
        <FieldContent>
          <Input id="vs-ro" model-value="GRG-0042" readonly />
          <FieldDescription>Switch to edit mode to change. Audit-tracked.</FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  </DemoCard>
  <DemoCard title="loading · async validation · static specimen">
    <FieldGroup>
      <Field>
        <FieldLabel>Customer code</FieldLabel>
        <FieldContent>
          <div class="relative">
            <Input model-value="GRG-0042" class="pr-8" />
            <span class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-muted-foreground">
              <FontAwesomeIcon :icon="faCircleNotch" class="animate-spin text-xs" aria-label="Checking" />
            </span>
          </div>
          <p class="text-sm text-muted-foreground">Checking uniqueness…</p>
        </FieldContent>
      </Field>
    </FieldGroup>
    <template #footer>
      <span>composition: <code>FormField</code> renders no pending indicator</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Form feedback

{@api vue:component:FormMessage} renders the form's {@term Non-Field Error} messages as one {@api vue:component:Alert}. It reads them from the {@term Form Context} and renders nothing when there are none. Its [`type`]{@api vue:component:FormMessage:prop:type} prop picks the messages and the Alert variant:

| `type`            | Messages           | Alert variant |
| ----------------- | ------------------ | ------------- |
| `error` (default) | Non-field errors   | `destructive` |
| `message`         | Non-field warnings | `warning`     |

One message renders as text inside the Alert. Several render as a list inside the same Alert. A message that is an object renders one `name: value` line per key. The default slot receives `message` and replaces how each message renders.

Theme keys: {@api theme-key:FormMessage}, {@api theme-key:Alert}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="single non-field error · destructive Alert">
    <Alert variant="destructive">
      <FontAwesomeIcon :icon="faCircleExclamation" />
      <AlertTitle>Couldn't save</AlertTitle>
      <AlertDescription>Server returned a conflict: this customer code is already in use.</AlertDescription>
    </Alert>
    <template #footer>
      <span>one message renders as text inside the Alert</span>
    </template>
  </DemoCard>
  <DemoCard title="multiple errors · single Alert with list">
    <Alert variant="destructive">
      <FontAwesomeIcon :icon="faCircleExclamation" />
      <AlertTitle>3 problems with this form</AlertTitle>
      <AlertDescription>
        <ul class="mt-1 list-disc list-inside flex flex-col gap-0.5">
          <li>Customer code is already in use.</li>
          <li>Billing address is required for invoiceable customers.</li>
          <li>Tax jurisdiction must match the billing province.</li>
        </ul>
      </AlertDescription>
    </Alert>
    <template #footer>
      <span>several messages render as a list inside one Alert</span>
    </template>
  </DemoCard>
  <DemoCard title="warning summary · non-blocking">
    <Alert variant="warning">
      <FontAwesomeIcon :icon="faTriangleExclamation" />
      <AlertTitle>Saved with warnings</AlertTitle>
      <AlertDescription>Tax ID format unfamiliar; saved as-is. Verify before posting invoices.</AlertDescription>
    </Alert>
    <template #footer>
      <span><code>type="message"</code> selects the <code>warning</code> variant</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Long-form layout

This demo builds a multi-section form from plain section markup, grids, and the field shell. Each section has a titled header and a divider, and its fields sit in a grid that collapses to one column on narrow screens. VUEDA's layout components for the same structure are {@api vue:component:FormSection}, {@api vue:component:FormSectionTitle}, and {@api vue:component:FormGrid}; the demo does not use them.

<VuedaDemo>
  <div class="rounded-vueda-card hairline hairline-border bg-card p-6">
    <header class="mb-6 flex flex-wrap items-baseline justify-between gap-3">
      <div>
        <h3 class="text-lg font-semibold leading-snug text-foreground">New customer</h3>
        <p class="mt-1 text-sm text-muted-foreground">Required fields marked with <span class="text-destructive" aria-hidden="true">*</span>.</p>
      </div>
      <span class="rounded-vueda-control hairline hairline-border bg-muted/50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unsaved</span>
    </header>
    <!-- Identity section -->
    <section class="mb-6">
      <div class="mb-4 flex items-baseline gap-3 border-b-hairline pb-2">
        <h4 class="text-sm font-semibold text-foreground">Identity</h4>
        <span class="text-xs text-muted-foreground">How this customer appears in lists and on documents.</span>
      </div>
      <FieldGroup>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel for="nc-name">Display name <span aria-hidden="true" class="text-destructive">*</span></FieldLabel>
            <FieldContent>
              <Input id="nc-name" placeholder="Granger Holdings" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel for="nc-code">Customer code</FieldLabel>
            <FieldContent>
              <Input id="nc-code" placeholder="auto-generated" />
              <FieldDescription>Leave blank to use <code>GRG-####</code>.</FieldDescription>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel for="nc-tax">Tax ID</FieldLabel>
            <FieldContent>
              <Input id="nc-tax" placeholder="12-3456789" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel for="nc-ccy">Default currency <span aria-hidden="true" class="text-destructive">*</span></FieldLabel>
            <FieldContent>
              <NativeSelect id="nc-ccy">
                <NativeSelectOption value="cad">CAD: Canadian Dollar</NativeSelectOption>
                <NativeSelectOption value="usd">USD: US Dollar</NativeSelectOption>
                <NativeSelectOption value="eur">EUR: Euro</NativeSelectOption>
              </NativeSelect>
            </FieldContent>
          </Field>
        </div>
      </FieldGroup>
    </section>
    <!-- Billing address section -->
    <section class="mb-6">
      <div class="mb-4 flex items-baseline gap-3 border-b-hairline pb-2">
        <h4 class="text-sm font-semibold text-foreground">Billing address</h4>
        <span class="text-xs text-muted-foreground">Used on invoices and statements.</span>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel for="nc-addr1">Street address</FieldLabel>
          <FieldContent>
            <Input id="nc-addr1" placeholder="100 King Street West" />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel for="nc-addr2">Suite / Unit</FieldLabel>
          <FieldContent>
            <Input id="nc-addr2" placeholder="Suite 4200" />
          </FieldContent>
        </Field>
        <div class="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel for="nc-city">City</FieldLabel>
            <FieldContent>
              <Input id="nc-city" placeholder="Toronto" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel for="nc-prov">Province</FieldLabel>
            <FieldContent>
              <NativeSelect id="nc-prov">
                <NativeSelectOption value="on">Ontario</NativeSelectOption>
                <NativeSelectOption value="qc">Quebec</NativeSelectOption>
                <NativeSelectOption value="bc">British Columbia</NativeSelectOption>
                <NativeSelectOption value="ab">Alberta</NativeSelectOption>
              </NativeSelect>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel for="nc-pc">Postal code</FieldLabel>
            <FieldContent>
              <Input id="nc-pc" placeholder="M5X 1A4" />
            </FieldContent>
          </Field>
        </div>
      </FieldGroup>
    </section>
    <!-- Primary contact section -->
    <section class="mb-6">
      <div class="mb-4 flex items-baseline gap-3 border-b-hairline pb-2">
        <h4 class="text-sm font-semibold text-foreground">Primary contact</h4>
        <span class="text-xs text-muted-foreground">The person who receives invoices and statements.</span>
      </div>
      <FieldGroup>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel for="nc-cname">Name</FieldLabel>
            <FieldContent>
              <Input id="nc-cname" placeholder="A/R contact" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel for="nc-role">Role</FieldLabel>
            <FieldContent>
              <Input id="nc-role" placeholder="Accounts Payable" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel for="nc-email">Email</FieldLabel>
            <FieldContent>
              <Input id="nc-email" type="email" placeholder="ar@granger.example" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel for="nc-phone">Phone</FieldLabel>
            <FieldContent>
              <Input id="nc-phone" type="tel" placeholder="+1 (416) 555-0142" />
            </FieldContent>
          </Field>
        </div>
      </FieldGroup>
    </section>
    <!-- Form actions -->
    <div class="flex flex-wrap items-center gap-2 pt-2 border-t-hairline">
      <Button type="submit" tone="primary">Create customer</Button>
      <Button emphasis="outline">Save as draft</Button>
      <span class="flex-1"></span>
      <Button emphasis="ghost">Cancel</Button>
    </div>
  </div>
</VuedaDemo>

## Auth patterns

The auth views place their form in a framed card, with the same field shell as any other form. The sign-in and two-factor views use {@api vue:component:AuthorizingForm}, which centers the card in the viewport. The change-password, device setup, and recovery-code views use {@api vue:component:AuthForm}, which places the card at the top of the page, below the page title. Both cards have the same width cap.

The demos below compose field primitives by hand, so they show the pattern and can differ from the shipped views. [Auth & MFA Views](./auth-and-mfa.md) shows the shipped views, and [Build Auth Views](../../guides/build-auth-views.md) describes the flows.

Theme keys: {@api theme-key:AuthorizingForm}, {@api theme-key:AuthForm}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="sign in · email, password, remember, SSO">
    <div class="flex items-start justify-center bg-muted/30 p-6 rounded-vueda-card">
      <div class="w-full max-w-sm rounded-vueda-card hairline hairline-border bg-card p-8">
        <h1 class="text-xl font-semibold leading-snug text-foreground">Sign in</h1>
        <p class="mt-1.5 text-sm text-muted-foreground">Use your VUEDA workspace credentials. Need access? Ask your administrator to send you an invite.</p>
        <FieldGroup class="mt-5 gap-4">
          <Field>
            <FieldLabel for="auth-email">
              Email address
              <span aria-hidden="true" class="text-destructive">*</span>
            </FieldLabel>
            <FieldContent>
              <Input id="auth-email" type="email" autocomplete="username" placeholder="you@granger.example" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel for="auth-pwd">
              Password
              <span aria-hidden="true" class="text-destructive">*</span>
            </FieldLabel>
            <FieldContent>
              <Input id="auth-pwd" type="password" autocomplete="current-password" placeholder="••••••••" />
              <FieldDescription>
                <a href="#" class="text-primary-text underline underline-offset-4">Forgot your password?</a>
              </FieldDescription>
            </FieldContent>
          </Field>
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox id="auth-remember" v-model="remember" />
            <Label for="auth-remember" class="font-normal cursor-pointer">Remember this device for 30 days</Label>
          </label>
        </FieldGroup>
        <div class="mt-5">
          <Button type="submit" tone="primary" class="w-full justify-center">Sign in</Button>
        </div>
        <div class="relative my-5 flex items-center gap-3">
          <div class="h-px flex-1 bg-border"></div>
          <span class="text-xs text-muted-foreground">or</span>
          <div class="h-px flex-1 bg-border"></div>
        </div>
        <Button emphasis="outline" class="w-full justify-center">
          <FontAwesomeIcon :icon="faMicrosoft" />
          Continue with single sign-on
        </Button>
        <p class="mt-5 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <span>New to VUEDA?</span>
          <a href="#" class="text-primary-text underline underline-offset-4">Request access</a>
        </p>
      </div>
    </div>
  </DemoCard>
  <DemoCard title="two-factor · code slots and recovery link">
    <div class="flex items-start justify-center bg-muted/30 p-6 rounded-vueda-card">
      <div class="w-full max-w-sm rounded-vueda-card hairline hairline-border bg-card p-8 text-center">
        <h1 class="text-xl font-semibold leading-snug text-foreground">Verify it's you</h1>
        <p class="mt-1.5 text-sm text-muted-foreground">We sent a 6-digit code to your authenticator app. Codes expire after 60 seconds.</p>
        <div class="mt-5 flex justify-center">
          <InputOTP :max-length="6">
            <InputOTPGroup>
              <InputOTPSlot :index="0" />
              <InputOTPSlot :index="1" />
              <InputOTPSlot :index="2" />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot :index="3" />
              <InputOTPSlot :index="4" />
              <InputOTPSlot :index="5" />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <div class="mt-5 flex gap-2">
          <Button type="submit" tone="primary" class="flex-1 justify-center">Verify</Button>
          <Button emphasis="ghost">Resend code</Button>
        </div>
        <p class="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <span>Lost your authenticator?</span>
          <a href="#" class="text-primary-text underline underline-offset-4">Use a recovery code</a>
        </p>
      </div>
    </div>
  </DemoCard>
  <DemoCard title="change password · current, new, confirm with error" class="lg:col-span-2">
    <div class="flex items-start justify-center bg-muted/30 p-6 rounded-vueda-card">
      <div class="w-full max-w-sm rounded-vueda-card hairline hairline-border bg-card p-8">
        <h1 class="text-xl font-semibold leading-snug text-foreground">Change your password</h1>
        <p class="mt-1.5 text-sm text-muted-foreground">Your administrator has required you to set a new password before continuing.</p>
        <FieldGroup class="mt-5 gap-4">
          <Field>
            <FieldLabel for="cp-cur">
              Current password
              <span aria-hidden="true" class="text-destructive">*</span>
            </FieldLabel>
            <FieldContent>
              <Input id="cp-cur" type="password" autocomplete="current-password" placeholder="••••••••" />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel for="cp-new">
              New password
              <span aria-hidden="true" class="text-destructive">*</span>
            </FieldLabel>
            <FieldContent>
              <Input id="cp-new" type="password" autocomplete="new-password" placeholder="••••••••••••" />
              <FieldDescription>At least 12 characters, including a number and a symbol.</FieldDescription>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel for="cp-conf">
              Confirm new password
              <span aria-hidden="true" class="text-destructive">*</span>
            </FieldLabel>
            <FieldContent>
              <Input id="cp-conf" type="password" autocomplete="new-password" model-value="abcd" aria-invalid="true" />
              <FieldMessage :messages="['Passwords do not match.']" />
            </FieldContent>
          </Field>
        </FieldGroup>
        <div class="mt-5 flex gap-2">
          <Button type="submit" tone="primary" class="flex-1 justify-center">Update password</Button>
          <Button emphasis="ghost">Sign out</Button>
        </div>
      </div>
    </div>
    <template #footer>
      <span>a field error renders under its field, with no form-level Alert</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Action form

`ActionForm` renders an action's confirmation form in the page flow. From top to bottom it shows:

1. An error display for failed fetches and failed action runs.
2. The form-scope feedback block: a `FormMessage` for non-field errors, a validation summary, and a `FormMessage` with `type="message"` for non-field warnings. The summary lists field errors that no rendered field shows, such as errors on `hidden` fields. The [`validation-summary`]{@api vue:component:ActionForm:slot:validation-summary} slot replaces it.
3. The form body, from the [`action-form-inner`]{@api vue:component:ActionForm:slot:action-form-inner} slot.
4. The action bar with the confirm and cancel buttons, from the [`action-bar`]{@api vue:component:ActionForm:slot:action-bar} slot.

`ActionForm` disables the confirm button while the action runs and while the form has client-side validation errors. {@term Server Feedback}, including errors from a failed {@term Dry Run}, leaves it enabled. A {@term Warning Confirmation} opens a dialog over the form.

{@api vue:component:ModelActionForm} wraps `ActionForm` for model actions. It adds a banner, the list of selected records, and the confirmation prompt inside the form body. The demos below are compositions of those parts.

Theme keys: {@api theme-key:ActionForm}, {@api theme-key:ModelActionForm}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="send 4 invoices — confirm step">
    <div class="overflow-hidden rounded-vueda-card hairline hairline-border bg-card">
      <header class="flex flex-wrap items-baseline justify-between gap-2 border-b-hairline bg-muted/30 px-4 py-3">
        <h3 class="text-sm font-semibold text-foreground">
          <span class="text-primary-text">Send</span> 4 invoices to customers
        </h3>
        <span class="text-xs text-muted-foreground">bulk action · dry-run validated</span>
      </header>
      <div class="px-4 py-3">
        <p class="text-sm text-muted-foreground">Each invoice will be emailed to the customer's billing contact. Sent invoices are locked and can no longer be edited. This action cannot be undone.</p>
        <ul class="mt-3 divide-y divide-border overflow-hidden rounded-vueda-control hairline hairline-border text-sm" aria-label="Selected invoices">
          <li class="flex items-center justify-between gap-4 px-3 py-2">
            <span class="font-medium text-foreground">INV-2026-00482 · Granger Holdings</span>
            <span class="font-mono text-xs text-muted-foreground">$14,820.00 · CAD</span>
          </li>
          <li class="flex items-center justify-between gap-4 px-3 py-2">
            <span class="font-medium text-foreground">INV-2026-00483 · Soletti &amp; Co.</span>
            <span class="font-mono text-xs text-muted-foreground">$6,300.00 · CAD</span>
          </li>
          <li class="flex items-center justify-between gap-4 px-3 py-2">
            <span class="font-medium text-foreground">INV-2026-00484 · Kestrel Logistics</span>
            <span class="font-mono text-xs text-muted-foreground">$22,140.50 · CAD</span>
          </li>
          <li class="flex items-center justify-between gap-4 px-3 py-2">
            <span class="font-medium text-foreground">INV-2026-00485 · Marchant Imports</span>
            <span class="font-mono text-xs text-muted-foreground">$980.00 · USD</span>
          </li>
        </ul>
        <div class="mt-4 flex flex-wrap gap-2">
          <Button type="submit" tone="primary">
            <FontAwesomeIcon :icon="faPaperPlane" />
            Yes, send all 4
          </Button>
          <Button emphasis="ghost">Cancel, go back</Button>
        </div>
      </div>
    </div>
    <template #footer>
      <span>renders in the page flow, with no overlay</span>
    </template>
  </DemoCard>
  <DemoCard title="with form-level error · dry-run failed">
    <div class="overflow-hidden rounded-vueda-card hairline hairline-border bg-card">
      <header class="flex flex-wrap items-baseline justify-between gap-2 border-b-hairline bg-muted/30 px-4 py-3">
        <h3 class="text-sm font-semibold text-foreground">
          <span class="text-primary-text">Void</span> 2 invoices
        </h3>
        <span class="text-xs text-muted-foreground">bulk action · dry-run failed</span>
      </header>
      <div class="px-4 py-3">
        <Alert variant="destructive" class="mb-3">
          <FontAwesomeIcon :icon="faCircleExclamation" />
          <AlertTitle>2 invoices can't be voided</AlertTitle>
          <AlertDescription>
            <ul class="mt-1 list-disc list-inside flex flex-col gap-0.5 text-sm">
              <li>INV-2026-00482 has been paid in full and is closed.</li>
              <li>INV-2026-00485 was already voided on 2026-04-12.</li>
            </ul>
          </AlertDescription>
        </Alert>
        <p class="text-sm text-muted-foreground">Resolve the listed problems and try again, or remove the affected invoices from your selection.</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <Button type="submit" tone="primary">Yes, void all 2</Button>
          <Button emphasis="ghost">Cancel, go back</Button>
        </div>
      </div>
    </div>
    <template #footer>
      <span>server errors leave the confirm button enabled</span>
      <span>several messages render as a list inside one Alert</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Repeated values: FieldSetMany

{@api vue:component:FieldSetMany} edits a list of values, with Add and Remove
controls. You can remove any entry, including the first and last. An optional
list can be empty; a required list reports a list-level error when empty.
Each added entry requires a value. Read-only lists disable Add and Remove.

The fieldset heading labels the list. Per-entry labels stay available to
assistive technology, and the default theme hides them visually so the heading
is not repeated. Remove aligns with the first control row, so validation
messages below an input do not move its button. The
{@api theme-key:FieldSetMany.rows}, {@api theme-key:FieldSetMany.component},
and {@api theme-key:FieldSetMany.removeButton} theme slots control this layout.

This example sets [`contextless`]{@api vue:component:FieldSetMany:prop:contextless}
and binds `v-model` to keep its draft local to the demo. Inside a form, the
component edits the array at its `name` path. Removing an entry shifts indexed
feedback with the remaining values, through the `removeArrayItem(name, index)`
method of the form context that
{@api js:function:@arrai-innovations/vueda/use/useForm#useForm} returns.

<VuedaDemo>
  <DemoCard title="optional email list">
    <FieldSetMany v-model="notificationEmails" contextless name="notification_emails" label="Notification emails" :required="false" :many-component="FormField">
      <WidgetTextInput type="email" />
    </FieldSetMany>
    <template #footer>remove all entries to return to an empty list; Add creates an entry that requires a value</template>
  </DemoCard>
</VuedaDemo>
