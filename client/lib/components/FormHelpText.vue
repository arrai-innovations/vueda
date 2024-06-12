<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
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
const fieldContext = inject(FieldContextSymbol);
const computedHelp = computed(() => props.help || fieldContext.help);
const combinedClasses = useCombinedClasses("@vueda/fields/FormHelpText.vue", props);
</script>
<template>
    <div :class="combinedClasses.helpClass">
        <slot :help="computedHelp">{{ computedHelp }}</slot>
    </div>
</template>
