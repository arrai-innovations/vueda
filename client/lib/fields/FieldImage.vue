<script setup>
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import isString from "lodash-es/isString.js";
import omit from "lodash-es/omit.js";
import { toRef, watch } from "vue";

/**
 * Field component for image upload values. Automatically marks the field as ignored when the current value is a string
 * (for example, an existing image URL returned by the server), and restores it when a new file object is provided.
 */

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
        if (isString(newValue)) {
            fieldContext.ignore();
            return;
        }
        fieldContext.removeIgnore();
    },
    { immediate: true },
);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-image">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
