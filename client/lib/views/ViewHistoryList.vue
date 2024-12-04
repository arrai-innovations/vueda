<script setup>
import { loadingCombine, useList } from "@arrai-innovations/reactive-helpers";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import PaginationComponent from "@vueda/components/PaginationComponent.vue";
import { useFormModel } from "@vueda/use/useFormModel.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";
import omit from "lodash-es/omit.js";
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
        default: "lg",
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
        f: ["history"],
    },
    intendToList: validAndActive,
});

const instanceList = useList({
    props: modelListProps,
    paged: true,
    keepOldPages: false,
    clearListOnListIntentTriggered: true,
});
const titleStr = computed(() => {
    return `History of ${modelConfig.info?.verbose_name}`;
});
const loading = computed(() => loadingCombine(instanceList.state.loading, modelConfig.loading));

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
const calculatedHistoryFieldsObjects = computed(() => {
    const history_fields = modelConfig.info?.expands?.filter((expand) => expand.name === "history")[0]?.f;
    return history_fields ? Object.entries(history_fields).map(([key, value]) => ({ name: key, ...value })) : [];
});
const computedFieldObjects = computed(() => {
    return props.fields.map((field) => {
        return (
            calculatedHistoryFieldsObjects.value.find((f) => f.name === field) ||
            extraFieldObjects.value.find((f) => f.name === field)
        );
    });
});
const calculatedHistoryFields = computed(() => {
    return calculatedHistoryFieldsObjects.value.map((field) => field.name);
});
const formFields = computed(() => {
    return ["history", ...Object.keys(modelConfig.info?.fields ?? {})];
});
const formModelProps = reactive({
    app: toRef(props, "app"),
    model: toRef(props, "model"),
    fields: formFields,
});
const router = useRouter();
const formModel = useFormModel(formModelProps);
const computedChangeObjects = computed(() => {
    return instanceList.state.objectsInOrder.flatMap((item, parentIndex) => {
        if (!item.num_changes) {
            return { ...item, field: "(Created)", parent_row: parentIndex };
        }
        return item.changes.map((change, changeIndex) => {
            let baseObject = {
                parent_row: parentIndex,
                field: change.field,
                new: change.new,
                old: change.old,
            };
            if (changeIndex === 0) {
                baseObject = { ...baseObject, ...omit(item, "changes") };
            }
            return baseObject;
        });
    });
});

const computedCalculatedObjects = computed(() => {
    if (isTable.value) {
        return computedChangeObjects.value;
    }
    return instanceList.state.objectsInOrder;
});

const evenColumn = (obj) => {
    return obj.parent_row % 2 === 0;
};
</script>
<template>
    <div :class="formModel.theme('root')">
        <page-title :loading="instanceList.state.loading" :title="titleStr">
            <template #button>
                <Button outlined text @click="router.back()"> Back </Button>
            </template>
        </page-title>
        <slot name="before-list" />
        <div class="flex flex-row">
            <objects-grid
                v-bind="$attrs"
                :calculated-objects="instanceList.state.calculatedObjects"
                class="w-full"
                :even-column="evenColumn"
                :field-props="{
                    pkKey: modelConfig.info?.pk,
                    modelInfo: modelConfig.info,
                    modelConfig: modelConfig.config,
                }"
                :fields="computedFieldObjects"
                :loading="loading"
                :objects-in-order="computedCalculatedObjects"
                :related-objects="instanceList.state.relatedObjects"
                :table-breakpoint="tableBreakpoint"
                @update:is-table="handleIsTableUpdate"
            >
                <template v-for="field in calculatedHistoryFields" :key="field" #[`field(${field})`]="{ obj }">
                    <slot :name="`field(${field})`" v-bind="{ obj }">
                        <component
                            :is="formModel.fieldComponents[`history__${field}`]"
                            v-if="formModel.fieldComponents[`history__${field}`]"
                            v-bind="formModel.fieldProps[`history__${field}`]"
                            :field-value="obj[field]"
                            :name="`${field}`"
                        >
                            <div>
                                <WidgetReadOnly
                                    v-bind="formModel.widgetProps[`history__${field}`]"
                                    :hidden="isTable"
                                    :name="`history__${field}`"
                                />
                            </div>
                        </component>
                    </slot>
                </template>
                <template #field(new)="{ obj }">
                    <slot name="field(new)">
                        <div v-if="!isTable" v-for="changed in obj.changes" :key="changed.field">
                            <component
                                :is="formModel.fieldComponents[changed.field]"
                                v-if="formModel.fieldComponents[changed.field]"
                                v-bind="formModel.fieldProps[changed.field]"
                                :field-value="changed.new"
                                :name="`${changed.field}_new`"
                            >
                                <div>
                                    <WidgetReadOnly
                                        v-bind="formModel.widgetProps[changed.field]"
                                        :name="`${changed.field}_new`"
                                    />
                                </div>
                            </component>
                        </div>
                        <component
                            :is="formModel.fieldComponents[obj.field]"
                            v-else-if="formModel.fieldComponents[obj.field]"
                            v-bind="formModel.fieldProps[obj.field]"
                            :field-value="obj.new"
                            :name="`${obj.field}_new`"
                        >
                            <div>
                                <WidgetReadOnly
                                    v-bind="formModel.widgetProps[obj.field]"
                                    :hidden="true"
                                    :name="`${obj.field}_new`"
                                />
                            </div>
                        </component>
                    </slot>
                </template>
                <template #field(old)="{ obj }">
                    <slot name="field(old)">
                        <div v-if="!isTable" v-for="changed in obj.changes" :key="changed.field">
                            <component
                                :is="formModel.fieldComponents[changed.field]"
                                v-if="formModel.fieldComponents[changed.field]"
                                v-bind="formModel.fieldProps[changed.field]"
                                :field-value="changed.old"
                                :name="`${changed.field}_old`"
                            >
                                <div>
                                    <WidgetReadOnly
                                        v-bind="formModel.widgetProps[changed.field]"
                                        :name="`${changed.field}_old`"
                                    />
                                </div>
                            </component>
                        </div>
                        <component
                            :is="formModel.fieldComponents[obj.field]"
                            v-else-if="formModel.fieldComponents[obj.field]"
                            v-bind="formModel.fieldProps[obj.field]"
                            :field-value="obj.old"
                            :name="`${obj.field}_old`"
                        >
                            <div>
                                <WidgetReadOnly
                                    v-bind="formModel.widgetProps[obj.field]"
                                    :hidden="true"
                                    :name="`${obj.field}_old`"
                                />
                            </div>
                        </component>
                    </slot>
                </template>
            </objects-grid>
        </div>

        <pagination-component
            v-model:current-page="currentPage"
            :rows="instanceList.state.perPage"
            :total-records="instanceList.state.totalRecords"
        ></pagination-component>
    </div>
</template>
