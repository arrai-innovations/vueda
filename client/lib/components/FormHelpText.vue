<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { containsHtml, sanitizeMessage } from "@vueda/utils/html.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import Message from "primevue/message";
import { computed, inject } from "vue";

const props = defineProps({
    help: {
        type: String,
        default: "",
    },
    size: {
        type: String,
        default: "small",
        validator: (value) => ["small", "large", null].includes(value),
    },
    variant: {
        type: String,
        default: null,
        validator: (value) => ["simple", "outlined", null].includes(value),
    },
    severity: {
        type: String,
        default: "help",
        validator: (value) => ["error", "warn", "help", "success", "info", "contrast", null].includes(value),
    },
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
const theme = useTheme("FormHelpText", props, fieldContext?.state);
</script>
<template>
    <div :class="theme('root')">
        <slot :attrs="$attrs" :help="computedHelp">
            <Message
                v-if="computedHelp?.length"
                v-bind="$attrs"
                :closable="false"
                :severity="severity"
                :size="size"
                :variant="variant"
            >
                <template v-if="allowHtml && containsHtml(computedHelp)">
                    <div v-html="computedHelp" />
                </template>
                <template v-else>
                    {{ computedHelp }}
                </template>
            </Message>
        </slot>
    </div>
</template>
