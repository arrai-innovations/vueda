<script setup>
import FormChores from "@vueda/components/FormChores.vue";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
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
    rangeSuffix: {
        type: Array,
        default: () => ["lower", "upper"],
    },
    ...THEME_OVERRIDE_PROPS,
});
const theme = useTheme("FieldSetRange");
const emit = defineEmits([...FIELD_EMITS]);

const fieldContext = useField(props, emit);

const fieldRangeProps = computed(() => {
    return props.rangeSuffix.map((suffix) => ({
        ...omit(props, "boundaryComponent", "label"),
        ...attrs,
        name: `${fieldContext.state.name}.${suffix}`,
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
                <component
                    :is="props.boundaryComponent"
                    v-bind="fieldProp"
                    class="flex-grow flex-row"
                    :label="getLabel(i)"
                >
                    <slot />
                </component>
            </template>
        </div>
        <form-chores>
            <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps" />
            </template>
        </form-chores>
    </div>
</template>
