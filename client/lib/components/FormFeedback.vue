<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

const props = defineProps({
    type: {
        type: String,
        default: "error",
        validator: (value) => ["error", "message"].includes(value),
    },
    messages: {
        type: Array,
        default: null,
    },
    variant: {
        type: String,
        default: "default",
    },
    errorsClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    errorClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    messagesClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    messageClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const fieldContext = inject(FieldContextSymbol);
const computedMessages = computed(() => props.messages || fieldContext[`${props.type}s`]?.[fieldContext.name] || []);
const combinedClasses = useCombinedClasses("@vueda/fields/FormFeedback.vue", props);
</script>
<template>
    <div v-if="computedMessages?.length" :class="combinedClasses[`{type}sClass`]">
        <ul>
            <li v-for="message in computedMessages" :key="message" :class="combinedClasses[`{type}Class`]">
                {{ message }}
            </li>
        </ul>
    </div>
</template>
