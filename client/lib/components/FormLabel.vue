<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import FloatLabel from "primevue/floatlabel";
import { computed, inject } from "vue";

const props = defineProps({
    for: {
        type: String,
        default: null,
    },
    label: {
        type: String,
        default: null,
    },
    variant: {
        type: String,
        default: "default",
    },
    labelClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const fieldContext = inject(FieldContextSymbol, null);
const computedFor = computed(() => props.for || fieldContext.name);
const computedLabel = computed(() => props.label || fieldContext.label);
const combinedClasses = useCombinedClasses("FormLabel", props);
</script>
<template>
    <FloatLabel>
        <slot name="default"></slot>
        <label :class="combinedClasses.labelClass" :for="computedFor">
            <slot :for="computedFor" :label="computedLabel" name="label">{{ computedLabel }}</slot>
        </label>
    </FloatLabel>
</template>
