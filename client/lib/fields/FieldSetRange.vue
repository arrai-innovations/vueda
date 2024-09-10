<script setup>
import FormChores from "@vueda/components/FormChores.vue";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import omit from "lodash-es/omit.js";
import { computed, toRef, useAttrs, watch } from "vue";

const attrs = useAttrs();
const props = defineProps({
    ...FIELD_PROPS,
    boundaryComponent: {
        type: Object,
        required: true,
    },
    type: {
        type: String,
        default: "number",
    },
});
const theme = useComputedClasses(vuedaTailwind.FieldSetRange);
const emit = defineEmits([...FIELD_EMITS]);

const fieldContext = useField(props, emit);

const fieldRangeProps = computed(() => {
    return [0, 1].map((index) => ({
        ...omit(props, "boundaryComponent"),
        ...attrs,
        name: `${fieldContext.state.name}[${index}]`,
    }));
});

const getLabel = (index) => {
    return index === 0 ? "From" : "To";
};
watch(
    toRef(fieldContext.state, "value"),
    (newValue) => {
        if (newValue === null || newValue === undefined || newValue === []) {
            return;
        }
        if (newValue.length > 1) {
            if (newValue[0] > newValue[1]) {
                fieldContext.updateError("range", "The first value must be less than the second value.");
            } else {
                fieldContext.deleteError("range");
            }
        }
    },
    { immediate: true, deep: true },
);
</script>
<template>
    <div :class="theme('root')" data-qa="field-set-many">
        <div :class="theme('header')">
            <label :class="theme('label')" :for="fieldContext.state.name">
                {{ fieldContext.state.label }}
            </label>
        </div>
        <div :class="theme('inner')">
            <template v-for="(fieldProp, i) in fieldRangeProps" :key="fieldProp.name">
                <component :is="props.boundaryComponent" v-bind="fieldProp" class="flex-grow flex-row">
                    <slot :label="getLabel(i)" />
                </component>
            </template>
        </div>
        <form-chores />
    </div>
</template>
