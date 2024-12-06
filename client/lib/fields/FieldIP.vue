<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import omit from "lodash-es/omit.js";
import { toRef, watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);

watch(
    toRef(fieldContext.state, "value"),
    (newValue) => {
        if (newValue === undefined || newValue === null) {
            return;
        }
        const coercedValue = newValue.toString();
        if (coercedValue !== newValue) {
            fieldContext.state.value = newValue;
        }
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-string">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
