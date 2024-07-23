<script setup>
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import useFilterFormModel from "@vueda/use/useFilterFormModel.js";

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

const filterFormModel = useFilterFormModel(props);

// todo: look into customizability re: overriding field / widget components with arbitrary slot content
// todo: it would be nice to have a way to layout the fields into fieldsets / grids
</script>

<template>
    <div class="flex flex-row gap-1 lg:gap-2 justify-between w-full" data-qa="form-filter-model">
        <template v-if="filterFormModel.filterFields?.length">
            <div v-if="$slots.beforeFields">
                <slot name="beforeFields" />
            </div>
            <div v-for="filterField in filterFormModel.filterFields" :key="filterField.name">
                <component
                    :is="filterFormModel.fieldComponents[filterField?.name]"
                    v-if="filterField"
                    v-bind="filterFormModel.fieldProps[filterField.name]"
                >
                    <template v-if="!$slots[`field-${filterField?.name}`]" #default>
                        <component
                            :is="filterFormModel.widgetComponents[filterField.name]"
                            v-bind="filterFormModel.widgetProps[filterField.name]"
                        />
                        <form-help-text />
                        <form-feedback type="error" />
                        <form-feedback type="message" />
                    </template>
                    <template v-else #default>
                        <slot :name="`field-${fieldObj?.name}`" />
                    </template>
                </component>
            </div>
            <div v-if="$slots.afterFields">
                <slot name="afterFields" />
            </div>
        </template>
        <template v-else>
            <loading-spinner-block />
            Loading model information.
        </template>
    </div>
</template>

<style scoped></style>
