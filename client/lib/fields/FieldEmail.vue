<script setup>
import { FIELD_EMITS, FIELD_PROPS, onBeforeFieldUnmount, useField } from "@vueda/use/useField.js";
import omit from "lodash-es/omit.js";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);

onBeforeFieldUnmount(fieldContext);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-email">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
