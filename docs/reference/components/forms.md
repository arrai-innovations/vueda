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

The form family covers the field shell that wraps every input, form-scope feedback, and compound form patterns. Three layers build on each other: the {@api vue:component:Field} family handles a single label/control/message stack; {@api vue:component:FieldGroup} composes multiple fields with consistent spacing and responsive orientation support; {@api vue:component:FormMessage} renders non-field (form-scope) errors as a consolidated Alert.

Token surface: {@api css-token:border}, {@api css-token:destructive}, {@api css-token:muted-foreground}, {@api css-token:ring}, {@api css-token:vueda-control-radius}.

This page is the visual contract the default theme guarantees. Use it as the target spec when you re-skin: every cell shown here should still read as the same surface after a customization, even if its color, density, or spacing shifts. If a cell breaks, the change has crossed from skin into design language.

For the mechanics of overriding any of this, see [Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md). Values belong in [CSS tokens](../theming/tokens.md); compositions belong in [theme keys](../theming/keys.md).

## Field shell: anatomy

{@api vue:component:Field} is the layout container. It groups a {@api vue:component:FieldLabel}, a {@api vue:component:FieldContent} column (which holds the control, optional {@api vue:component:FieldDescription}, and any {@api vue:component:FieldMessage}), and an optional required indicator. The `orientation` prop switches between `vertical` (default), `horizontal`, and `responsive`.

Theme keys: {@api theme-key:Field}, {@api theme-key:FieldLabel}, {@api theme-key:FieldContent}, {@api theme-key:FieldDescription}.

<VuedaDemo class="grid gap-6 lg:grid-cols-3">
  <DemoCard title="vertical (default) — label above">
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
    <template #footer>
      <span>default orientation</span>
      <span>label: <code>FieldLabel</code> · content column: <code>FieldContent</code></span>
    </template>
  </DemoCard>
  <DemoCard title="horizontal — label left, flex-row">
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
    <template #footer>
      <span>label and content sit side by side</span>
      <span>label uses a capped flex basis so content keeps room</span>
    </template>
  </DemoCard>
  <DemoCard title="responsive — vertical then horizontal at @md">
    <FieldGroup>
      <Field orientation="responsive">
        <FieldLabel for="anat-r">Display name</FieldLabel>
        <FieldContent>
          <Input id="anat-r" model-value="Granger Holdings" />
          <FieldDescription>Flip occurs at the <code>FieldGroup</code> <code>@md</code> container breakpoint.</FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
    <template #footer>
      <span>uses container query <code>@md/field-group</code></span>
      <span>parent must be a <code>FieldGroup</code> or equivalent container</span>
    </template>
  </DemoCard>
  <DemoCard title="required indicators — three options" class="lg:col-span-2">
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
          <span class="font-normal text-muted-foreground">— optional</span>
        </FieldLabel>
        <FieldContent>
          <Input id="req-c" type="email" placeholder="ar@granger.example" />
        </FieldContent>
      </Field>
    </FieldGroup>
    <template #footer>
      <span>asterisk: <code>text-destructive</code> span inside label</span>
      <span>chip: <code>border + rounded-vueda-control</code> slab · same 10px caps weight</span>
      <span>optional marker: <code>font-normal text-muted-foreground</code></span>
    </template>
  </DemoCard>
  <DemoCard title="disabled label cascade">
    <FieldGroup>
      <Field>
        <FieldLabel for="dis-a">Customer code</FieldLabel>
        <FieldContent>
          <Input id="dis-a" model-value="GRG-0042" disabled />
          <FieldDescription>Set automatically when the record was created.</FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
    <template #footer>
      <span><code>peer-disabled:opacity-50</code> cascades from the sibling input</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Field: validation states

{@api vue:component:FieldMessage} handles both error and warning severity beneath the control. Error messages render in `text-destructive`; warning messages render in amber. Multiple messages automatically switch to a bulleted list. The control's own state line comes from the `Input` theme key, not the field shell: `aria-invalid="true"` paints it destructive, and `data-warning="true"` paints it amber.

Theme keys: {@api theme-key:FieldMessage}. Token surface: {@api css-token:destructive}, {@api css-token:warning}.

{@api vue:component:FormField} accepts `hideLabel` when a surrounding layout already supplies the label. Help text, errors, and warnings still render below the control. {@api vue:component:FieldSetTabularInline} uses this mode because its column headers (or card headers on narrow screens) already name each field. The separate `hidden` prop continues to suppress the whole field shell, including messages.

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
    <template #footer>
      <span>rest: <code>--field</code> fill, bottom line <code>--field-line</code></span>
    </template>
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
    <template #footer>
      <span>full <code>--ring</code> edge returns on focus</span>
      <span>ring: <code>--ring/30</code> · 2px · 2px offset</span>
    </template>
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
      <span>trailing status icon: absolute in relative wrapper</span>
      <span>valid glyph: <code>text-success</code></span>
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
      <span>single string: renders as inline text</span>
      <span>field line: <code>hairline-destructive</code> via <code>aria-invalid</code></span>
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
      <span>multiple strings: renders as <code>ul</code> with <code>list-disc</code></span>
    </template>
  </DemoCard>
  <DemoCard title="warning · non-blocking">
    <FieldGroup>
      <Field>
        <FieldLabel for="vs-warn">Tax ID</FieldLabel>
        <FieldContent>
          <Input id="vs-warn" model-value="12-3456789" data-warning="true" />
          <FieldMessage severity="warning" :messages="['Format unfamiliar — saved as-is. Verify before posting invoices.']" />
        </FieldContent>
      </Field>
    </FieldGroup>
    <template #footer>
      <span><code>severity="warning"</code> → amber text · <code>role="status"</code></span>
      <span>field line: <code>hairline-warning</code> via <code>data-warning</code> · ring untouched, and an <code>aria-invalid</code> error outranks it</span>
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
    <template #footer>
      <span>input: the <code>--disabled</code> fill replaces <code>--field</code>, the line softens to <code>--border</code>, and the ink is <code>--disabled-foreground</code></span>
      <span>distinct from read-only beside it, which keeps no fill at all</span>
    </template>
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
    <template #footer>
      <span>readonly: no pointer cursor · no focus ring · value selectable</span>
    </template>
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
      <span>trailing spinner: absolute · <code>animate-spin</code></span>
      <span>inline status line: <code>text-muted-foreground</code></span>
    </template>
  </DemoCard>
</VuedaDemo>

## Form-level feedback

{@api vue:component:FormMessage} renders non-field (form-scope) errors as a single {@api vue:component:Alert}. When multiple messages arrive, they appear as a list inside one Alert rather than a stack of separate alerts. The `type="message"` prop switches the Alert variant to `warning` for non-blocking feedback.

Theme key: {@api theme-key:FormMessage}. Token surface: {@api css-token:destructive}, {@api css-token:warning}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="single non-field error · destructive Alert">
    <Alert variant="destructive">
      <FontAwesomeIcon :icon="faCircleExclamation" />
      <AlertTitle>Couldn't save</AlertTitle>
      <AlertDescription>Server returned a conflict — this customer code is already in use.</AlertDescription>
    </Alert>
    <template #footer>
      <span>one error → single line inside Alert</span>
      <span><code>FormMessage</code> wraps this pattern automatically</span>
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
      <span>multiple errors → one Alert · list inside description</span>
      <span>avoids a wall of red from stacked separate alerts</span>
    </template>
  </DemoCard>
  <DemoCard title="warning summary · non-blocking">
    <Alert variant="warning">
      <FontAwesomeIcon :icon="faTriangleExclamation" />
      <AlertTitle>Saved with warnings</AlertTitle>
      <AlertDescription>Tax ID format unfamiliar — saved as-is. Verify before posting invoices.</AlertDescription>
    </Alert>
    <template #footer>
      <span><code>type="message"</code> on <code>FormMessage</code> → <code>warning</code> Alert variant</span>
    </template>
  </DemoCard>
  <DemoCard title="FormHiddenFeedback stub · tabular inline cells">
    <div class="flex items-center gap-2">
      <Input model-value="grg" aria-invalid="true" class="w-40" />
      <button type="button" class="inline-flex size-8 shrink-0 items-center justify-center rounded-vueda-control border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/20" aria-label="2 errors" title="2 errors">
        <FontAwesomeIcon :icon="faCircleExclamation" class="text-sm" />
      </button>
    </div>
    <p class="mt-2 text-xs text-muted-foreground">Used in tabular inline cells where there is no room for a message line. Opens a popover with the field errors. Final visuals belong with ObjectsGrid.</p>
    <template #footer>
      <span>icon-only trigger · popover deferred to ObjectsGrid pass</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Long-form layout: new customer

Section headers and a 2-column grid compose multi-section forms. A `vk-form-section-title` header groups related fields, and a divider separates sections. Repeating contact rows (FieldSet machinery) belong with the ObjectsGrid pass.

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
                <NativeSelectOption value="cad">CAD — Canadian Dollar</NativeSelectOption>
                <NativeSelectOption value="usd">USD — US Dollar</NativeSelectOption>
                <NativeSelectOption value="eur">EUR — Euro</NativeSelectOption>
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
        <span class="text-xs text-muted-foreground">A FieldSet of additional contacts ships with the ObjectsGrid pass.</span>
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
  <template #footer>
    <span>section header: <code>text-sm font-semibold</code> + border-b divider</span>
    <span>2-col grid: <code>sm:grid-cols-2</code> · 3-col for address sub-row</span>
    <span>action bar: <code>flex gap-2</code> · spacer pushes Cancel to trailing edge</span>
  </template>
</VuedaDemo>

## Auth patterns

Auth forms use a centered card on a flat neutral surface. The login form uses a `w-[35rem]` card with standard field layout. The authorizing form (2FA, change password) uses the same card in a narrower configuration. Both are composed from the same field primitives as any other form — the difference is only the page shell.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="login — email + password + remember + SSO">
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
    <template #footer>
      <span>card: <code>max-w-sm</code> · <code>p-8</code> · <code>bg-card</code></span>
      <span>SSO divider: hairline + "or" label · no badge, no colour</span>
    </template>
  </DemoCard>
  <DemoCard title="2FA — OTP slot row + recovery link">
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
    <template #footer>
      <span>OTP: centered with <code>justify-center</code> flex wrapper</span>
      <span>same card shell as login · narrower text area</span>
    </template>
  </DemoCard>
  <DemoCard title="change password — current / new / confirm with error" class="lg:col-span-2">
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
      <span>error on "confirm" field: <code>aria-invalid</code> + <code>FieldMessage</code></span>
      <span>field error stays inline · no form-scope Alert needed for a single field</span>
    </template>
  </DemoCard>
</VuedaDemo>

## ActionForm: bulk action panel

ActionForm sits inline above the list of selected records — no overlay, no drawer. It frames a summary of the action, the affected records, and confirm/cancel buttons. The theme keys map 1:1: `root`, `inner`, `list`, `buttons`. The form-scope feedback block (for dry-run failures) uses the same consolidated Alert pattern as any other form.

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
      <span>inline panel · not an overlay or drawer</span>
      <span>action verb in <code>text-primary-text</code> · record list as bordered table</span>
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
          <Button type="submit" tone="primary" disabled>Yes, void all 2</Button>
          <Button emphasis="ghost">Cancel, go back</Button>
        </div>
      </div>
    </div>
    <template #footer>
      <span>consolidated Alert at top · submit stays but is <code>disabled</code></span>
      <span>single Alert · list inside description · no stacked alerts</span>
    </template>
  </DemoCard>
</VuedaDemo>

## Customization surface

The field shell is the most frequently customized part of VUEDA's theme. The highest-value keys for structural change are:

- {@api theme-key:Field}: `root` — gap between label and content, flex direction per orientation, invalid color cascade.
- {@api theme-key:FieldLabel}: `root` — font-weight, size, checked-state highlight on inline checkbox/radio labels.
- {@api theme-key:FieldContent}: `root` — gap between control, description, and message lines.
- {@api theme-key:FieldDescription}: `root` — text color, size, link decoration.
- {@api theme-key:FieldMessage}: `root` — error text color; `list` — multi-message bullet list layout.
- {@api theme-key:FormMessage}: `root` — margin around the consolidated Alert; `list` — list layout inside Alert.
- {@api theme-key:FieldGroup}: `root` — gap between fields, container-query scope for responsive orientation.

## Repeated values: FieldSetMany

{@api vue:component:FieldSetMany} edits a list of values, with Add and Remove
controls. Every entry can be removed, including the first and last. An optional
list can be empty; a required list reports a list-level error when empty.
Each added entry requires a value. Read-only lists disable Add and Remove.

The fieldset heading labels the list. Per-entry labels stay available to assistive
technology, while the default theme visually hides them to avoid repeating the
heading. Remove aligns with the top control row, so validation messages below an
input do not move its button. The `rows`, `component`, and `removeButton` slots on
{@api theme-key:FieldSetMany} control this layout.

This example uses `contextless` and `v-model` to keep its draft local to the demo.
Inside a form, the component uses the array at its `name` path. Removing an entry
shifts indexed feedback with the remaining values through
{@api js:function:@arrai-innovations/vueda/use/useForm#useForm}'s `removeArrayItem(name, index)` method.

<VuedaDemo>
  <DemoCard title="optional email list">
    <FieldSetMany v-model="notificationEmails" contextless name="notification_emails" label="Notification emails" :required="false" :many-component="FormField">
      <WidgetTextInput type="email" />
    </FieldSetMany>
    <template #footer>remove all entries to return to an empty list; Add creates an entry that requires a value</template>
  </DemoCard>
</VuedaDemo>
