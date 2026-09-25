<script setup>
import Button from "@vueda/controls/button/Button.vue";
import LoadingSpinnerInline from "@vueda/display/loading/LoadingSpinnerInline.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import AuthorizingForm from "@vueda/views/AuthorizingForm.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import { computed, reactive, useSlots } from "vue";

/**
 * Default sign-in view. Renders an email and password credential form inside an
 * AuthorizingForm card. Post-login routing and MFA pending-flow detection come from
 * AuthorizingForm (via useSignInFlow); submission, loading, and server-side validation
 * mapping come from the inner ActionForm.
 *
 * Integrators can use this view as-is, adjust copy and behaviour through props
 * (`header`, `subTitle`, `redirect`, `formProps`, `requireRecentLogin`, theme
 * overrides, all forwarded to AuthorizingForm), or replace individual pieces through
 * the `field(email)`, `widget(email)`, `field(password)`, `widget(password)`, and
 * `action-bar` slots. Any other AuthorizingForm or ActionForm slot is forwarded through.
 *
 * @vueda-slot-forward AuthorizingForm
 */
defineOptions({});

const formProps = reactive({
    initialValues: {
        email: "",
        password: "",
    },
});
const emit = defineEmits([
    /** Emitted on mount with a readonly ref to the reactive form values object. */
    "form-object",
    /** Emitted on mount with the form context. Use its methods for programmatic form updates. */
    "form-context",
]);
const userStore = storeUser();

const handleSubmit = ({ formValues }) => {
    return userStore.login({
        email: formValues.email,
        password: formValues.password,
    });
};

// Slots ViewSignIn renders with its own defaults; excluded from the generic forward
// loop so an explicit default and a forwarded consumer slot never define the same slot
// twice on the AuthorizingForm.
const slots = useSlots();
const HANDLED_SLOTS = new Set(["action-form-inner", "action-bar"]);
const forwardedSlots = computed(() => Object.keys(slots).filter((name) => !HANDLED_SLOTS.has(name)));
</script>
<template>
    <authorizing-form
        :run-action="handleSubmit"
        header="Sign In"
        sub-title="Enter your email and password below to login to your account"
        :form-props="formProps"
        action-error-summary="Sign In Failed"
        @form-object="emit('form-object', $event)"
        @form-context="emit('form-context', $event)"
    >
        <template #action-form-inner>
            <!-- Replaces the entire email field row, including its label. -->
            <slot name="field(email)" label="Email">
                <FormField validation="text" label="Email" name="email">
                    <!-- Replaces the email input widget; receives standard widget props. -->
                    <slot name="widget(email)" :required="true" autocomplete="username">
                        <WidgetTextInput :required="true" autocomplete="username" />
                    </slot>
                </FormField>
            </slot>
            <!-- Replaces the entire password field row, including its label. -->
            <slot name="field(password)" label="Password">
                <FormField validation="text" label="Password" name="password">
                    <!-- Replaces the password input widget; receives standard widget props. -->
                    <slot name="widget(password)" :required="true" type="password" autocomplete="current-password">
                        <WidgetTextInput :required="true" type="password" autocomplete="current-password" />
                    </slot>
                </FormField>
            </slot>
        </template>
        <!-- Single "Sign In" action. VUEDA admin apps expose only a landing and sign-in
             publicly, so a sign-in form has nowhere to cancel to; ActionForm's default
             confirm + cancel pair is replaced with one submit button. The strip chrome
             mirrors ActionForm's `buttons` strip, but the button itself is full-width
             rather than left-aligned: ActionForm's left alignment reads as "start of a
             confirm/cancel cluster", which doesn't apply with a single button and no
             cluster to anchor, so it's sized to match the field width above it instead.
             Gated on `loading` only (never the form's anyError): a rejected login surfaces
             a form-scope `non_field_errors` error that no field edit can clear, so
             anyError gating would permanently disable retry; a login form must stay
             re-submittable since the server re-validates each attempt. -->
        <template #action-bar="actionBarProps">
            <slot name="action-bar" v-bind="actionBarProps">
                <div
                    class="flex flex-row flex-wrap items-center gap-2 px-4 py-3 mt-2 border-t-hairline bg-muted/25 rounded-b-vueda-card"
                >
                    <Button type="submit" tone="primary" class="w-full" :disabled="actionBarProps.loading">
                        <LoadingSpinnerInline v-if="actionBarProps.loading" />
                        Sign In
                    </Button>
                </div>
            </slot>
        </template>
        <template v-for="slot in forwardedSlots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </authorizing-form>
</template>
