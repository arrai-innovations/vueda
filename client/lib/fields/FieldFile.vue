<script setup>
import { FIELD_EMITS, FIELD_PROPS, onBeforeFieldUnmount, useField } from "@vueda/use/useField.js";
import { isObject } from "lodash-es";
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
        if (isObject(newValue)) {
            if (newValue instanceof File) {
                fieldContext.removeIgnore();
                return;
            }
            fieldContext.ignore();
        } else {
            fieldContext.removeIgnore();
        }
    },
    { immediate: true },
);

onBeforeFieldUnmount(fieldContext);
</script>
<template>
    <div :class="$attrs.class" data-qa="field-file">
        <slot :field-attrs="omit($attrs, ['class'])" :field-props="props" />
    </div>
</template>
