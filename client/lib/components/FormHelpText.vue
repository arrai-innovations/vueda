<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { containsHtml, sanitizeMessage } from "@vueda/utils/html.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import Message from "primevue/message";
import { computed, inject, reactive, toRef } from "vue";

/**
 * Renders a help text message for a form field, sourcing the text from the `help` prop or the injected field context.
 */
defineOptions({});

const props = defineProps({
    /** Help text to display; falls back to the field context's `help` if empty. */
    help: {
        type: String,
        default: "",
    },
    /** Size variant forwarded to the PrimeVue Message component. */
    size: {
        type: String,
        default: "small",
        validator: (value) => ["small", "large", null].includes(value),
    },
    /** Visual variant forwarded to the PrimeVue Message component. */
    variant: {
        type: String,
        default: "simple",
        validator: (value) => ["simple", "outlined", null].includes(value),
    },
    /** Severity forwarded to the PrimeVue Message component. */
    severity: {
        type: String,
        default: "info",
        validator: (value) => ["error", "warn", "primary", "success", "info", "contrast", null].includes(value),
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
const theme = useTheme(
    "FormHelpText",
    props,
    reactive({
        variant: toRef(props, "variant"),
    }),
);
</script>
<template>
    <div :class="theme('root')">
        <!-- Replaces the default help message display; receives `attrs` and `help` as slot props. -->
        <slot :attrs="$attrs" :help="computedHelp">
            <Message
                v-if="computedHelp?.length"
                v-bind="$attrs"
                :closable="false"
                :severity="severity"
                :size="size"
                :variant="variant"
            >
                <template #icon="slotProps">
                    <slot name="icon" v-bind="slotProps" />
                </template>
                <template v-if="allowHtml && containsHtml(computedHelp)">
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <div v-html="computedHelp" />
                </template>
                <template v-else>
                    {{ computedHelp }}
                </template>
            </Message>
        </slot>
    </div>
</template>
