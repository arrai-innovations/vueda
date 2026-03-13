<script setup>
import { cn } from "@vueda/utils/cn.js";
import { computed } from "vue";

/**
 * Displays field validation errors from a slot or an array of error strings or objects,
 * deduplicating messages and rendering a list when multiple errors are present.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** One or more error strings or objects with a message property to display beneath the field. */
    errors: { type: Array, default: undefined },
});

const content = computed(() => {
    if (!props.errors || props.errors.length === 0) return null;

    const uniqueErrors = [
        ...new Map(
            props.errors.filter(Boolean).map((error) => {
                const message = typeof error === "string" ? error : error?.message;
                return [message, error];
            }),
        ).values(),
    ];

    if (uniqueErrors.length === 1 && uniqueErrors[0]) {
        return typeof uniqueErrors[0] === "string" ? uniqueErrors[0] : uniqueErrors[0].message;
    }

    return uniqueErrors.map((error) => (typeof error === "string" ? error : error?.message));
});
</script>

<template>
    <div
        v-if="$slots.default || content"
        role="alert"
        data-slot="field-error"
        :class="cn('text-destructive text-sm font-normal', props.class)"
    >
        <slot v-if="$slots.default" />

        <template v-else-if="typeof content === 'string'">
            {{ content }}
        </template>

        <ul v-else-if="Array.isArray(content)" class="ml-4 flex list-disc flex-col gap-1">
            <li v-for="(error, index) in content" :key="index">
                {{ error }}
            </li>
        </ul>
    </div>
</template>
