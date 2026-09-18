<script setup>
import FieldRenderer from "@vueda/form/form-model/FieldRenderer.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldMessage from "@vueda/shell/field/FieldMessage.vue";
import "@vueda/theme/vueda-tailwind/form/FieldSetRange.theme.js";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FilterModelSymbol, FormModelSymbol } from "@vueda/utils/symbols.js";
import IsObject from "lodash-es/isObject.js";
import { computed, inject, useSlots, watch } from "vue";

/**
 * Composite field that renders a pair of sub-fields for the lower and upper
 * boundaries of a range, deriving their field names from the parent field name
 * combined with the configured suffixes. Validates that the lower bound does
 * not exceed the upper bound.
 */
defineOptions({});
const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
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
const icon = useIcons("FieldSetRange", props);
const emit = defineEmits([...FIELD_EMITS]);

const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });
const slots = useSlots();
const formModel = inject(FormModelSymbol, null);
const filterModel = inject(FilterModelSymbol, null);
const boundaryNames = computed(() => {
    // Built from this field's identity (`formModelName`), not its value path (`name`): a top-level
    // range field's `name` is the flattened, lodash-safe form of that same identity (see
    // `toFlatValuePath`), and concatenating onto it here would bake the escaping into the boundary's
    // own identity instead of just its value path.
    return props.suffixes.map((suffix) => `${fieldContext.state.formModelName}.${suffix}`) ?? [];
});

const hasChoresContent = computed(
    () =>
        !!fieldContext.state.help ||
        Object.keys(fieldContext.state.errors).length > 0 ||
        Object.keys(fieldContext.state.messages).length > 0,
);
const hasChoresSlot = computed(() => !!slots["field-set-level-chores"]);

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
    <div :class="theme('root')" :style="theme.hideStyle?.value" data-qa="field-set-range" data-vueda-fieldset>
        <div :class="theme('header')">
            <label :class="theme('label')" :for="fieldContext.state.name">
                {{ fieldContext.state.label }}
            </label>
        </div>
        <div :class="theme('inner')" data-qa="field-set-range-inner">
            <template v-for="(name, boundaryIndex) in boundaryNames" :key="name">
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
                <div
                    v-if="boundaryIndex === 0 && boundaryNames.length > 1"
                    :class="theme('separator')"
                    data-qa="field-set-range-separator"
                    aria-hidden="true"
                >
                    <!-- @slot [separator] Replaces the glyph rendered between the lower and upper sub-fields. -->
                    <slot name="separator">
                        <component
                            :is="icon('rangeSeparator').component"
                            v-if="icon('rangeSeparator')"
                            v-bind="icon('rangeSeparator').props"
                        />
                        <span v-else aria-hidden="true">→</span>
                    </slot>
                </div>
            </template>
        </div>
        <div v-if="hasChoresContent || hasChoresSlot" :class="theme('choresPanel')" data-qa="field-set-range-chores">
            <!-- @slot [field-set-level-chores] Override the validation block rendered below the range sub-fields. -->
            <slot name="field-set-level-chores">
                <FieldDescription v-if="fieldContext.state.help">
                    {{ fieldContext.state.help }}
                </FieldDescription>
                <FieldMessage :messages="Object.values(fieldContext.state.errors)" />
                <FieldMessage
                    v-if="Object.keys(fieldContext.state.messages).length"
                    severity="warning"
                    :messages="Object.values(fieldContext.state.messages)"
                />
            </slot>
        </div>
    </div>
</template>
