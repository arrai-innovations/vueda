<script setup>
import FormChores from "@vueda/components/FormChores.vue";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { getFormChoresSlotNames } from "@vueda/utils/buildForm.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import Button from "primevue/button";
import { computed, toRef, useAttrs, watch } from "vue";

const attrs = useAttrs();
const props = defineProps({
    ...FIELD_PROPS,
    manyComponent: {
        type: Object,
        required: true,
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);

const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });

const fieldProps = computed(() => {
    const values = fieldContext.state.value;
    const indexes = Array.isArray(values) && values.length ? values.map((_, index) => index) : [0];
    return indexes.map((index) => ({
        ...props,
        ...attrs,
        name: `${fieldContext.state.name}[${index}]`,
    }));
});

watch(
    () => fieldContext.state.value,
    (value) => {
        if (value !== null && value !== undefined && !Array.isArray(value)) {
            logger.warn(`Expected value to be an array or null/undefined, got:`, value);
        }
    },
    { immediate: true },
);

const onAdd = () => {
    fieldContext.state.value = [...(fieldContext.state.value ?? []), undefined];
};

const onDestroy = (index) => {
    fieldContext.state.value = (fieldContext.state.value ?? []).filter((_, i) => i !== index);
};
const theme = useTheme("FieldSetMany", props);
</script>
<template>
    <div data-qa="field-set-many">
        <div :class="theme('header')">
            <slot :field-label="fieldContext.state.label" :field-name="fieldContext.state.name" name="label">
                <label :class="theme('label')" :for="fieldContext.state.name">
                    {{ fieldContext.state.label }}
                </label>
            </slot>
            <slot name="add" @click="onAdd">
                <Button label="add" @click="onAdd"></Button>
            </slot>
        </div>
        <div v-if="fieldProps?.length">
            <template v-for="(fieldProp, index) in fieldProps" :key="index">
                <slot :name="`field(${fieldProp.name})`" v-bind="{ fieldProps, index }">
                    <div :class="theme('row')">
                        <div :class="theme('component')">
                            <component :is="props.manyComponent" v-bind="fieldProp" :required="index > 0">
                                <slot :hidden="true" />
                            </component>
                        </div>
                        <div v-if="index">
                            <slot name="destroy" @click="onDestroy(index)">
                                <Button icon="pi pi-times" rounded @click="onDestroy(index)" />
                            </slot>
                        </div>
                    </div>
                </slot>
            </template>
        </div>
        <form-chores>
            <template v-for="slot in getFormChoresSlotNames(fieldContext.state.name)" #[slot]="formChoresSlotProps">
                <slot :name="slot" v-bind="formChoresSlotProps" />
            </template>
        </form-chores>
    </div>
</template>
