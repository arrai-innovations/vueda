<script setup>
import "@vueda/theme/vueda-tailwind/shell/FieldMessage.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, reactive, toRef } from "vue";

/**
 * Displays field messages (errors or warnings) from a slot or an array of
 * strings, arrays of strings (e.g. multiple server messages under one error
 * code), or objects with a `message` property, deduplicating and rendering
 * a list when multiple messages are present.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** One or more message strings, arrays of message strings, or objects with a message property to display beneath the field. */
    messages: { type: Array, default: undefined },
    /** Controls color and ARIA role. */
    severity: {
        type: String,
        default: "error",
        validator: (value) => ["error", "warning"].includes(value),
    },
});

const theme = useTheme("FieldMessage", props, reactive({ severity: toRef(props, "severity") }));

const content = computed(() => {
    if (!props.messages || props.messages.length === 0) {
        return null;
    }

    const flattenedMessages = props.messages.filter(Boolean).flatMap((msg) => (Array.isArray(msg) ? msg : [msg]));

    const uniqueMessages = [
        ...new Map(
            flattenedMessages.filter(Boolean).map((msg) => {
                const message = typeof msg === "string" ? msg : msg?.message;
                return [message, msg];
            }),
        ).values(),
    ];

    if (uniqueMessages.length === 1 && uniqueMessages[0]) {
        return typeof uniqueMessages[0] === "string" ? uniqueMessages[0] : uniqueMessages[0].message;
    }

    return uniqueMessages.map((msg) => (typeof msg === "string" ? msg : msg?.message));
});
</script>

<template>
    <div
        v-if="$slots.default || content"
        :role="severity === 'error' ? 'alert' : 'status'"
        data-slot="field-message"
        :data-severity="severity"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot v-if="$slots.default" />

        <template v-else-if="typeof content === 'string'">
            {{ content }}
        </template>

        <ul v-else-if="Array.isArray(content)" :class="theme('list')">
            <li v-for="(msg, index) in content" :key="index">
                {{ msg }}
            </li>
        </ul>
    </div>
</template>
