<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import omit from "lodash-es/omit.js";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
useField(props, emit);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-UUID">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
