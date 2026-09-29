<script setup>
import { toast } from "@arrai-innovations/vue-sonner";
import Button from "@vueda/controls/button/Button.vue";
import LoadingSpinnerInline from "@vueda/display/loading/LoadingSpinnerInline.vue";
import FormField from "@vueda/form/form-model/FormField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import AuthorizingForm from "@vueda/views/AuthorizingForm.vue";
import WidgetTextInput from "@vueda/widgets/WidgetTextInput.vue";
import { computed, reactive, useSlots } from "vue";

/**
 * Default forgot password view. Asks for an email address and requests a password reset link
 * for it, inside an AuthorizingForm card.
 *
 * The server answers the same way whether or not an account uses the address, so the
 * confirmation does not say that one does. Replace pieces through the `field(email)`,
 * `widget(email)`, `action-bar`, and `suffix` slots; any other AuthorizingForm or ActionForm
 * slot is forwarded through.
 *
 * @vueda-slot-forward AuthorizingForm
 */
defineOptions({});

const props = defineProps({
    /** Route location for the "Back to sign in" link. */
    signInTo: {
        type: [String, Object],
        default: () => ({ name: "sign-in" }),
    },
});
const emit = defineEmits([
    /** Emitted on mount with a readonly ref to the reactive form values object. */
    "form-object",
    /** Emitted on mount with the form context. Use its methods for programmatic form updates. */
    "form-context",
]);

const formProps = reactive({
    initialValues: {
        email: "",
    },
});
const userStore = storeUser();

const handleSubmit = ({ formValues }) => {
    return userStore.forgotPassword({ email: formValues.email });
};

const announceSent = () => {
    toast.success("Check Your Email", {
        description: "If an account uses that address, it will receive a link to reset its password.",
        duration: 10000,
    });
};

// Slots rendered here with their own defaults; excluded from the generic forward loop so a
// forwarded consumer slot and an explicit default never define the same slot twice.
const slots = useSlots();
const HANDLED_SLOTS = new Set(["action-form-inner", "action-bar", "suffix"]);
const forwardedSlots = computed(() => Object.keys(slots).filter((name) => !HANDLED_SLOTS.has(name)));
</script>
<template>
    <authorizing-form
        :run-action="handleSubmit"
        header="Forgot Password"
        sub-title="Enter the email address for your account, and we will email you a link to reset your password"
        :form-props="formProps"
        action-error-summary="Reset Link Not Sent"
        :on-submission-success-handler="announceSent"
        @form-object="emit('form-object', $event)"
        @form-context="emit('form-context', $event)"
    >
        <template #action-form-inner>
            <!-- Replaces the entire email field row, including its label. -->
            <slot name="field(email)" label="Email">
                <FormField validation="text" label="Email" name="email">
                    <!-- Replaces the email input widget; receives standard widget props. -->
                    <slot name="widget(email)" :required="true" autocomplete="email">
                        <WidgetTextInput :required="true" autocomplete="email" />
                    </slot>
                </FormField>
            </slot>
        </template>
        <!-- One submit button, sized like ViewSignIn's, since there is nothing to cancel back to. -->
        <template #action-bar="actionBarProps">
            <slot name="action-bar" v-bind="actionBarProps">
                <div
                    class="flex flex-row flex-wrap items-center gap-2 px-4 py-3 mt-2 border-t-hairline bg-muted/25 rounded-b-vueda-card"
                >
                    <Button type="submit" tone="primary" class="w-full" :disabled="actionBarProps.loading">
                        <LoadingSpinnerInline v-if="actionBarProps.loading" />
                        Send Reset Link
                    </Button>
                </div>
            </slot>
        </template>
        <template #suffix>
            <!-- Content below the form card; defaults to a link back to sign in. -->
            <slot name="suffix" :sign-in-to="props.signInTo">
                <div class="flex justify-center py-2">
                    <Button as-child emphasis="link" size="sm">
                        <router-link :to="props.signInTo">Back to sign in</router-link>
                    </Button>
                </div>
            </slot>
        </template>
        <template v-for="slot in forwardedSlots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </authorizing-form>
</template>
