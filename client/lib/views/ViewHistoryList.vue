<script setup>
import { loadingCombine, useList } from "@arrai-innovations/reactive-helpers";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import PaginationComponent from "@vueda/components/PaginationComponent.vue";
import { useFormModel } from "@vueda/use/useFormModel.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { singlePagePaginatedHistoryListCrudAdaptor } from "@vueda/utils/listCrud.js";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";
import Button from "primevue/button";
import { computed, reactive, ref, toRef } from "vue";
import { useRouter } from "vue-router";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    pk: {
        type: String,
        required: true,
    },
    pageKey: {
        type: String,
        default: "p",
    },
    tableBreakpoint: {
        type: String,
        default: "md",
    },
    fields: {
        type: Array,
        default: () => [
            "history_id",
            "history_date",
            "history_change_reason",
            "history_type",
            "history_user",
            "history_relation",
            "field",
            "old",
            "new",
        ],
    },
});
const isTable = ref(true);
const handleIsTableUpdate = (newValue) => {
    isTable.value = newValue;
};
const viewName = "history-list";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);
const isActive = useIsActive();
const validAndActive = computed(() => !!(isActive.value && props.app && props.model && modelConfig.info?.pk));
const currentPage = ref(1);
const modelListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
        pk: toRef(props, "pk"),
        action: "history_list",
    },
    retrieveArgs: {},
    pkKey: "history_id",
    listArgs: {
        [props.pageKey]: currentPage,
    },
    intendToList: validAndActive,
});

const instanceList = useList({
    props: modelListProps,
    functions: {
        list: singlePagePaginatedHistoryListCrudAdaptor,
    },
    paged: true,
    keepOldPages: false,
    clearListOnListIntentTriggered: true,
});
const titleStr = computed(() => {
    return `History of ${modelConfig.info?.verbose_name}`;
});
const loading = computed(() => loadingCombine(instanceList.state.loading, modelConfig.loading));

// return it in the config?
const extraFieldObjects = computed(() => {
    const objects = [
        {
            name: `old`,
            extra: true,
            label: "Old",
        },
        {
            name: `new`,
            extra: true,
            label: "New",
        },
    ];
    if (isTable.value) {
        objects.push({
            name: `field`,
            extra: true,
            label: "Field",
        });
    }
    return objects;
});
const calculatedDisplayFields = computed(() => {
    const history_fields = modelConfig.info?.expands?.filter((expand) => expand.name === "history")[0]?.f;
    return history_fields ? Object.entries(history_fields).map(([key, value]) => ({ name: key, ...value })) : [];
});
const computedFieldObjects = computed(() => {
    return props.fields.map((field) => {
        return (
            calculatedDisplayFields.value.find((f) => f.name === field) ||
            extraFieldObjects.value.find((f) => f.name === field)
        );
    });
});

const get_changed_field = (obj) => {
    return Object.keys(obj)
        .filter((key) => key.endsWith("_new"))
        .map((key) => key.replace("_new", ""));
};
const get_value = (obj, field_name) => {
    return Object.entries(obj)
        .filter(([key]) => key === field_name)
        .map(([, value]) => value)[0];
};
const router = useRouter();
const theme = useTheme("ViewHistoryList");
const formModel = useFormModel({ app: toRef(props, "app"), model: toRef(props, "model") });
</script>
<template>
    <div>
        <page-title :loading="instanceList.state.loading" :title="titleStr">
            <template #button>
                <Button outlined text @click="router.back()"> Back </Button>
            </template>
        </page-title>
        <slot name="before-list" />
        <objects-grid
            v-bind="$attrs"
            :calculated-objects="instanceList.state.calculatedObjects"
            class="w-full"
            :data-qa="`history-list-${app}-${model}-objects-grid`"
            :field-props="{
                pkKey: modelConfig.info?.pk,
                modelInfo: modelConfig.info,
                modelConfig: modelConfig.config,
            }"
            :fields="computedFieldObjects"
            :loading="loading"
            :objects-in-order="instanceList.state.objectsInOrder"
            :related-objects="instanceList.state.relatedObjects"
            :table-breakpoint="tableBreakpoint"
            :table-field-classes="{
                field: theme('nestedRowGroup'),
                old: theme('nestedRowGroup'),
                new: theme('nestedRowGroup'),
            }"
            @update:is-table="handleIsTableUpdate"
        >
            <template #field(field)="{ obj }">
                <slot name="field(field)">
                    <div v-if="obj.changes == 0" :class="theme('nestedRow')">(Created)</div>
                    <div v-for="field in get_changed_field(obj)" :key="field" :class="theme('nestedRow')">
                        {{ field }}
                    </div>
                </slot>
            </template>
            <template #field(new)="{ obj }">
                <slot name="field(new)">
                    <div v-for="field in get_changed_field(obj)" :key="field" :class="theme('nestedRow')">
                        <component
                            :is="formModel.fieldComponents[field]"
                            v-if="formModel.fieldComponents[field]"
                            v-bind="formModel.fieldProps[field]"
                            :name="`${field}_new`"
                        >
                            <div>
                                <WidgetReadOnly
                                    v-bind="formModel.widgetProps[field]"
                                    :hidden="isTable"
                                    :model-value="get_value(obj, `${field}_new`)"
                                    :name="`${field}_new`"
                                />
                            </div>
                        </component>
                    </div>
                </slot>
            </template>
            <template #field(old)="{ obj }">
                <slot name="field(old)">
                    <div v-for="field in get_changed_field(obj)" :key="field" :class="theme('nestedRow')">
                        <component
                            :is="formModel.fieldComponents[field]"
                            v-if="formModel.fieldComponents[field]"
                            v-bind="formModel.fieldProps[field]"
                            :name="`${field}_old`"
                        >
                            <div>
                                <WidgetReadOnly
                                    v-bind="formModel.widgetProps[field]"
                                    :hidden="isTable"
                                    :model-value="get_value(obj, `${field}_old`)"
                                    :name="`${field}_old`"
                                />
                            </div>
                        </component>
                    </div>
                </slot>
            </template>
        </objects-grid>

        <pagination-component
            v-model:current-page="currentPage"
            :rows="instanceList.state.perPage"
            :total-records="instanceList.state.totalRecords"
        ></pagination-component>
    </div>
</template>
