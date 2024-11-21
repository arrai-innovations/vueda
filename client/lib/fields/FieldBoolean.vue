<script setup>
import { FIELD_EMITS, FIELD_PROPS, onBeforeFieldUnmount, useField } from "@vueda/use/useField.js";
import { toRef, watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
    nullable: {
        type: Boolean,
        default: false,
    },
    requiredFn: {
        type: Function,
        default: () => () => true,
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);

watch(
    toRef(fieldContext.state, "value"),
    (newValue) => {
        if (newValue === null && props.nullable) {
            return;
        }
        const coercedValue = !!newValue;
        if (coercedValue !== newValue) {
            fieldContext.state.value = coercedValue;
        }
    },
    { immediate: true },
);
onBeforeFieldUnmount(fieldContext);
</script>
<template>
    <div data-qa="field-boolean">
        <slot :field-attrs="$attrs" :field-props="props" />
    </div>
</template>
