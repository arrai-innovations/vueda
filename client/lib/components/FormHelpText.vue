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
const fieldContext = inject(FieldContextSymbol, null);
const computedHelp = computed(() => props.help || fieldContext?.help);
</script>
<template>
    <div v-if="computedHelp || $slots.default">
        <slot :help="computedHelp">{{ computedHelp }}</slot>
    </div>
</template>
