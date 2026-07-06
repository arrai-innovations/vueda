<script setup>
import Alert from "@vueda/feedback/alert/Alert.vue";
import AlertDescription from "@vueda/feedback/alert/AlertDescription.vue";
import "@vueda/theme/vueda-tailwind/form/FormMessage.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { NON_FIELD_ERRORS_KEY } from "@vueda/utils/constants.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import isObject from "lodash-es/isObject.js";
import { computed, inject } from "vue";

/**
 * Renders form-scope non-field validation feedback as a single Alert. When
 * multiple messages are present, they are rendered as a list inside one
 * Alert rather than as a stack of separate alerts.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether to render errors (`"error"`) or warnings (`"message"`). */
    type: {
        type: String,
        default: "error",
        validator: (value) => ["error", "message"].includes(value),
    },
});

/** @type {import("@vueda/use/useForm.js").FormContext|null} */
const formContext = inject(FormContextSymbol, null);

const messages = computed(() => {
    const slice = props.type === "error" ? formContext?.state?.errors : formContext?.state?.messages;
    const entries = slice?.[NON_FIELD_ERRORS_KEY];
    if (!entries) return [];
    return Object.values(entries).flatMap((value) => (Array.isArray(value) ? value : [value]));
});

const variant = computed(() => (props.type === "message" ? "warning" : "destructive"));
const theme = useTheme("FormMessage", props);
</script>

<template>
    <Alert
        v-if="messages.length"
        :variant="variant"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <AlertDescription>
            <template v-if="messages.length === 1">
                <!-- Replaces the rendering for a single message; receives `message` as a slot prop. -->
                <slot :message="messages[0]">
                    <template v-if="isObject(messages[0])">
                        <div v-for="[name, value] of Object.entries(messages[0])" :key="name">
                            {{ name }}: {{ value }}
                        </div>
                    </template>
                    <template v-else>{{ messages[0] }}</template>
                </slot>
            </template>
            <ul v-else :class="theme('list')">
                <li v-for="(msg, i) in messages" :key="i">
                    <!-- Replaces the rendering of each list item; receives `message` as a slot prop. -->
                    <slot :message="msg">
                        <template v-if="isObject(msg)">
                            <div v-for="[name, value] of Object.entries(msg)" :key="name">{{ name }}: {{ value }}</div>
                        </template>
                        <template v-else>{{ msg }}</template>
                    </slot>
                </li>
            </ul>
        </AlertDescription>
    </Alert>
</template>
