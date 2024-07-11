<script setup>
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

const props = defineProps({
    help: {
        type: String,
        default: "",
    },
    variant: {
        type: String,
        default: "default",
    },
    helpClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
/** @type {import("@vueda/use/useField.js").FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const computedHelp = computed(() => (props.help?.length ? props.help : fieldContext?.state?.help));
</script>
<template>
    <div v-if="computedHelp || $slots.default">
        <slot :help="computedHelp">{{ computedHelp }}</slot>
    </div>
</template>
