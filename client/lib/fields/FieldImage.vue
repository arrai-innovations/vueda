<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import omit from "lodash-es/omit.js";

/**
 * Field component for image upload values. Provides field context for the
 * image upload widget. The ignore/removeIgnore lifecycle (which prevents
 * unchanged server-side image URLs from being submitted) is handled by the
 * widget layer.
 */

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
    <div :class="$attrs.class" data-qa="field-image">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
