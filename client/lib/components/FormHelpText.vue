<script setup>
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import Message from "primevue/message";
import { computed, inject } from "vue";

const props = defineProps({
    help: {
        type: String,
        default: "",
    },
});
/** @type {import("@vueda/use/useField.js").FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const computedHelp = computed(() => (props.help?.length ? props.help : fieldContext?.state?.help));
</script>
<template>
    <slot :help="computedHelp">
        <Message v-if="computedHelp?.length" :closable="false" severity="help">{{ computedHelp }}</Message>
    </slot>
</template>
