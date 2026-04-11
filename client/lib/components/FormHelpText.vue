<script setup>
import FeedbackAlert from "@vueda/feedback/alert/FeedbackAlert.vue";
import FeedbackAlertDescription from "@vueda/feedback/alert/FeedbackAlertDescription.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { containsHtml, sanitizeMessage } from "@vueda/utils/html.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * Renders help text for a form field, sourcing the text from the `help` prop or the injected field context.
 */
defineOptions({});

const props = defineProps({
    /** Help text to display; falls back to the field context's `help` if empty. */
    help: {
        type: String,
        default: "",
    },
    /** Severity level controlling the alert variant. */
    severity: {
        type: String,
        default: "info",
        validator: (value) => ["error", "warn", "success", "info", null].includes(value),
    },
    /** When `true`, help text containing HTML is rendered as HTML. */
    allowHtml: {
        type: Boolean,
        default: true,
        description: "Allows rendering of messages as HTML if true.",
    },
    ...THEME_OVERRIDE_PROPS,
});
/** @type {import("@vueda/use/useField.js").FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const computedHelp = computed(() => sanitizeMessage(props.help?.length ? props.help : fieldContext?.state?.help));
const SEVERITY_TO_VARIANT = {
    error: "destructive",
    warn: "warning",
    success: "success",
    info: "info",
};
const alertVariant = computed(() => SEVERITY_TO_VARIANT[props.severity] ?? "default");
const theme = useTheme("FormHelpText", props);
</script>
<template>
    <div :class="theme('root')">
        <!-- Replaces the default help message display; receives `attrs` and `help` as slot props. -->
        <slot :attrs="$attrs" :help="computedHelp">
            <FeedbackAlert v-if="computedHelp?.length" v-bind="$attrs" :variant="alertVariant">
                <!-- @slot icon Replaces the default icon area inside the help alert. -->
                <slot name="icon" />
                <FeedbackAlertDescription>
                    <template v-if="allowHtml && containsHtml(computedHelp)">
                        <!-- eslint-disable-next-line vue/no-v-html -->
                        <div v-html="computedHelp" />
                    </template>
                    <template v-else>
                        {{ computedHelp }}
                    </template>
                </FeedbackAlertDescription>
            </FeedbackAlert>
        </slot>
    </div>
</template>
