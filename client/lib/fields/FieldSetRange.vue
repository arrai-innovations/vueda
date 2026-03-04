<script setup>
import FieldRenderer from "@vueda/components/FieldRenderer.vue";
import FormChores from "@vueda/components/FormChores.vue";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { getFormChoresSlotNames } from "@vueda/utils/buildForm.js";
import { FilterModelSymbol, FormModelSymbol } from "@vueda/utils/symbols.js";
import IsObject from "lodash-es/isObject.js";
import { computed, inject, watch } from "vue";

/**
 * Composite field that renders a pair of sub-fields for the lower and upper
 * boundaries of a range, deriving their field names from the parent field name
 * combined with the configured suffixes. Validates that the lower bound does
 * not exceed the upper bound.
 */
defineOptions({});
const props = defineProps({
    ...FIELD_PROPS,
    /** The data type of the range boundaries (e.g. "number" or "date"). */
    type: {
        type: String,
        default: "number",
    },
    /**
     * A two-element array of suffixes appended to the field name to produce the
     * lower and upper boundary field names; must be provided in lower, upper order.
     */
    suffixes: {
        type: Array,
        default: () => ["lower", "upper"],
        description: "The suffixes should always be in the order lower, upper.",
    },
    ...THEME_OVERRIDE_PROPS,
});
const theme = useTheme("FieldSetRange", props);
const emit = defineEmits([...FIELD_EMITS]);

const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });
const formModel = inject(FormModelSymbol, null);
const filterModel = inject(FilterModelSymbol, null);
const boundaryNames = computed(() => {
    return props.suffixes.map((suffix) => `${fieldContext.state.name}__${suffix}`) ?? [];
});

const lower = computed(() => {
    return fieldContext.state.value?.[props.suffixes[0]] ?? null;
});
const upper = computed(() => {
    return fieldContext.state.value?.[props.suffixes[1]] ?? null;
});

watch(
    () => fieldContext.state.value,
    (value) => {
        if (value === null || value === undefined) {
            fieldContext.deleteError("range");
            return;
        }
        if (!IsObject(value)) {
            logger.warn(`Expected value to be an object {upper: '', lower: ''}, got:`, value);
            fieldContext.deleteError("range");
            return;
        }
        if (lower.value !== null && lower.value !== undefined && upper.value !== null && upper.value !== undefined) {
            if (props.type === "number" && lower.value > upper.value) {
                fieldContext.updateError("range", "The first value must be less than or equal to the second value.");
            } else if (props.type === "date") {
                const lowerDate = new Date(lower.value);
                const upperDate = new Date(upper.value);
                if (isNaN(lowerDate.getTime()) || isNaN(upperDate.getTime())) {
                    fieldContext.updateError("range", "Invalid date.");
                } else if (lowerDate > upperDate) {
                    fieldContext.updateError("range", "The first date must be less than or equal to the second date.");
                } else {
                    fieldContext.deleteError("range");
                }
            } else {
                fieldContext.deleteError("range");
            }
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
        <!-- Override the default form-level chores (e.g. non-field errors) rendered above the range sub-fields. -->
        <slot name="field-set-level-chores">
            <form-chores :variant="null">
                <template
                    v-for="slot in getFormChoresSlotNames(fieldContext.state.formModelName)"
                    #[slot]="formChoresSlotProps"
                >
                    <slot :name="slot" v-bind="formChoresSlotProps" />
                </template>
            </form-chores>
        </slot>
        <div :class="theme('inner')">
            <template v-for="name in boundaryNames" :key="name">
                <field-renderer
                    :form-model="formModel ?? filterModel"
                    :form-model-name="name"
                    :hidden="false"
                    v-bind="$attrs"
                >
                    <template v-for="slotName in $slots" #[slotName]="slotProps">
                        <slot :name="slotName" v-bind="slotProps" />
                    </template>
                </field-renderer>
            </template>
        </div>
    </div>
</template>
