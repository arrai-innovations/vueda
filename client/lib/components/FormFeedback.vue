<script setup>
import useCombinedClasses from "@vueda/use/useCombinedClasses.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import isEmpty from "lodash-es/isEmpty.js";
import InlineMessage from "primevue/inlinemessage";
import { inject, ref, toRef, watch } from "vue";

const props = defineProps({
    type: {
        type: String,
        default: "error",
        validator: (value) => ["error", "message"].includes(value),
    },
    messages: {
        type: Object,
        default: null,
        description: "Messages to display, in code: message pairs",
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
const feedbackItems = ref([]);

watch(
    [toRef(fieldContext, "errors"), toRef(fieldContext, "messages"), toRef(props, "type"), toRef(props, "messages")],
    ([errors, messages]) => {
        if (props.messages) {
            feedbackItems.value = Object.values(props.messages);
            return;
        }
        feedbackItems.value = props.type === "error" ? errors : messages;
    },
    { immediate: true },
);

const combinedClasses = useCombinedClasses("@vueda/components/FormFeedback.vue", props);
</script>
<template>
    <div v-if="!isEmpty(feedbackItems)" :class="combinedClasses[`{type}sClass`]">
        <InlineMessage
            v-for="message in Object.values(feedbackItems)"
            :key="message"
            :severity="type === 'message' ? 'info' : 'error'"
            >{{ message }}</InlineMessage
        >
    </div>
</template>
