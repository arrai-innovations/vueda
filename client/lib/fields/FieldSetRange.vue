<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { computed, useAttrs } from "vue";

const attrs = useAttrs();
const props = defineProps({
    ...FIELD_PROPS,
    boundaryComponent: {
        type: Object,
        required: true,
    },
});
const theme = useComputedClasses(vuedaTailwind.FieldSetRange);
const emit = defineEmits([...FIELD_EMITS]);

const fieldContext = useField(props, emit);

const fieldRangeProps = computed(() => {
    return [0, 1].map((index) => ({
        ...props,
        ...attrs,
        name: `${fieldContext.state.name}[${index}]`,
    }));
});
</script>
<template>
    <div data-qa="field-set-many">
        <div :class="theme('header')">
            <label :class="theme('label')" :for="fieldContext.state.name">
                {{ fieldContext.state.label }}
            </label>
        </div>
        <template v-for="prop in fieldRangeProps" :key="prop.name">
            <component :is="props.manyComponent" v-bind="prop">
                <slot />
            </component>
        </template>
    </div>
</template>
