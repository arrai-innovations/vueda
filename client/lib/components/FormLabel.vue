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
/** @type {import("@vueda/use/useField.js").FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const computedFor = computed(() => (props.for?.length ? props.for : fieldContext?.state.name));
const computedLabel = computed(() => (props.label?.length ? props.label : fieldContext?.state.label));
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
