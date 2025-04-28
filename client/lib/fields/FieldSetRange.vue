<script setup>
import FormChores from "@vueda/components/FormChores.vue";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
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
const theme = useTheme("FieldSetRange", props);
const emit = defineEmits([...FIELD_EMITS]);

const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });

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
    () => fieldContext.state.value,
    (value) => {
        if (value === null || value === undefined) {
            fieldContext.deleteError("range");
            return;
        }
        if (!Array.isArray(value)) {
            logger.warn(`Expected value to be an array [lower, upper], got:`, value);
            fieldContext.deleteError("range");
            return;
        }
        if (value.length === 0) {
            // empty range, no error, just no validation
            fieldContext.deleteError("range");
            return;
        }
        if (value.length !== 2) {
            logger.warn(`Expected array of length 2 [lower, upper], got:`, value);
            fieldContext.deleteError("range");
            return;
        }
        const [lower, upper] = value;
        if (lower != null && upper != null && lower > upper) {
            fieldContext.updateError("range", "The first value must be less than or equal to the second value.");
        } else {
            fieldContext.deleteError("range");
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
