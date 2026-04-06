<script setup>
import { cn } from "@vueda/utils/cn.js";
import { computed } from "vue";

/**
 * Displays field messages (errors or warnings) from a slot or an array of
 * strings or objects with a `message` property, deduplicating and rendering
 * a list when multiple messages are present.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** One or more message strings or objects with a message property to display beneath the field. */
    messages: { type: Array, default: undefined },
    /** Controls color and ARIA role. */
    severity: {
        type: String,
        default: "error",
        validator: (value) => ["error", "warning"].includes(value),
    },
});

const content = computed(() => {
    if (!props.messages || props.messages.length === 0) return null;

    const uniqueMessages = [
        ...new Map(
            props.messages.filter(Boolean).map((msg) => {
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
        :class="
            cn(
                'text-sm font-normal',
                severity === 'error' ? 'text-destructive' : 'text-amber-600 dark:text-amber-500',
                props.class,
            )
        "
    >
        <slot v-if="$slots.default" />

        <template v-else-if="typeof content === 'string'">
            {{ content }}
        </template>

        <ul v-else-if="Array.isArray(content)" class="ml-4 flex list-disc flex-col gap-1">
            <li v-for="(msg, index) in content" :key="index">
                {{ msg }}
            </li>
        </ul>
    </div>
</template>
