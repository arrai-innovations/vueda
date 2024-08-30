<script setup>
import FormChores from "@vueda/components/FormChores.vue";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isArray from "lodash-es/isArray.js";
import Button from "primevue/button";
import { computed, toRef, useAttrs, watch } from "vue";

const attrs = useAttrs();
const props = defineProps({
    ...FIELD_PROPS,
    manyComponent: {
        type: Object,
        required: true,
    },
});
const preprocessGet = (value) => {
    if (value === undefined || value === null) {
        return value;
    }
    return isArray(value) ? value : [value];
};

const emit = defineEmits([...FIELD_EMITS]);

const fieldContext = useField(props, emit, { preprocessGet });

const fieldData = computed(() => {
    const values = fieldContext.state.value;
    const indexes = isArray(values) && values.length ? values.map((_, index) => index) : [0];
    return indexes.map((index) => ({
        props: {
            ...props,
            ...attrs,
            name: `${fieldContext.state.name}[${index}]`,
        },
        index,
    }));
});

const onAdd = () => {
    fieldContext.state.value = [...(cloneDeep(fieldContext.state.value) || [""]), undefined];
};

const onDelete = (index) => {
    fieldContext.state.value = cloneDeep(fieldContext.state.value).filter((_, i) => i !== index);
};
const theme = useComputedClasses(vuedaTailwind.FieldSetMany);

const isEmptyValue = (value) => {
    return value === "";
};
watch(
    toRef(fieldContext.state, "value"),
    (newValue) => {
        if (Array.isArray(newValue) && newValue.length === 1 && isEmptyValue(newValue[0])) {
            fieldContext.state.value = [];
        }
    },
    { immediate: true, deep: true },
);
</script>
<template>
    <div data-qa="field-set-many">
        <div :class="theme('header')">
            <label :class="theme('label')" :for="fieldContext.state.name">
                {{ fieldContext.state.label }}
            </label>
            <Button label="add" @click="onAdd"></Button>
        </div>
        <div v-if="fieldData?.length">
            <template v-for="field in fieldData" :key="field.index">
                <div :class="theme('component')">
                    <div class="w-5/6">
                        <component :is="props.manyComponent" v-bind="field.props" :required="field.index > 0">
                            <slot :show-label="false" />
                        </component>
                    </div>
                    <div v-if="field.index">
                        <Button label="delete" @click="onDelete(field.index)" />
                    </div>
                </div>
            </template>
        </div>
        <form-chores />
    </div>
</template>
