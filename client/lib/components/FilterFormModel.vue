<script setup>
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
// FormLabel is now deleted
// import FormLabel from "@vueda/components/FormLabel.vue";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import useFilterFormModel from "@vueda/use/useFilterFormModel.js";
import { computed, ref } from "vue";

const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    filterFields: {
        type: Array,
        default: () => [],
    },
    variant: {
        type: String,
        default: "default",
    },
    fieldsClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const emit = defineEmits(["submit", "dirty"]);

const filterFormModel = useFilterFormModel(props);

const handleSubmit = (form) => {
    emit("submit", form);
};
const formWrapperRef = ref(null);
const formContext = computed(() => {
    return formWrapperRef.value?.form;
});
defineExpose({ form: formContext });
// todo: look into customizability re: overriding field / widget components with arbitrary slot content
// todo: it would be nice to have a way to layout the fields into fieldsets / grids
const combinedClasses = useCombinedClasses("FilterFormModel", props);
</script>

<template>
    <form-wrapper ref="formWrapperRef" @submit="handleSubmit">
        <template #default>
            <template v-if="filterFormModel.filterFields?.length">
                <slot name="beforeFields" />
                <div
                    v-for="filterField in filterFormModel.filterFields"
                    :key="filterField.name"
                    :class="combinedClasses.fieldsClass"
                >
                    <component
                        :is="filterFormModel.fieldComponents[filterField?.name]"
                        v-if="filterField"
                        v-bind="filterField"
                    >
                        <template v-if="!$slots[`field-${filterField?.name}`]" #default>
                            <form-label>
                                <template #default>
                                    <component
                                        :is="filterFormModel.widgetComponents[filterField.name]"
                                        v-bind="filterFormModel.widgetProps[filterField.name]"
                                    />
                                </template>
                            </form-label>
                            <form-help-text />
                            <form-feedback type="error" />
                            <form-feedback type="message" />
                        </template>
                    </component>
                </div>
                <slot name="afterFields" />
            </template>
            <template v-else>
                <loading-spinner-block />
                Loading model information.
            </template>
        </template>
    </form-wrapper>
</template>

<style scoped></style>
