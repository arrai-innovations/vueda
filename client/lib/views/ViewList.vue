<script setup>
import { assignReactiveObject, loadingCombine, useList } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FilterFormModel from "@vueda/components/FilterFormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import PaginationComponent from "@vueda/components/PaginationComponent.vue";
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { useForm } from "@vueda/use/useForm.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { getCRUDName, memoizedStartCase } from "@vueda/utils/crudSupport.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEqual from "lodash-es/isEqual.js";
import Button from "primevue/button";
import InputGroup from "primevue/inputgroup";
import InputText from "primevue/inputtext";
import { computed, onMounted, reactive, readonly, ref, toRaw, toRef, unref, watch } from "vue";
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
    pageKey: {
        type: String,
        default: "p",
    },
    searchKey: {
        type: String,
        default: "s",
    },
    listFields: {
        type: Array,
        default: () => [],
    },
    displayFields: {
        type: Array,
        default: () => [],
    },
    relatedObjectsRules: {
        type: Object,
        default: () => ({}),
    },
    calculatedObjectsRules: {
        type: Object,
        default: () => ({}),
    },
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    headerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    titleClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    loadingClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    listActionsClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    listActionClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    detailActionsClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    detailActionClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    objectGridVariant: {
        type: String,
        default: "default",
    },
    listArgs: {
        type: Object,
        default: () => ({}),
    },
    // as long as there are no collisions, $attrs can be used to pass through any other props to objects-grid
});
const listSearch = ref(null);
const filterFormModelRef = ref(null);
const isActive = useIsActive();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const sorting = reactive({
    state: {
        sortable: computed(() => modelConfig?.config?.listSortable),
        sorted: [],
    },
    updateSorted: (sorted) => {
        // todo: objects-grid handles the display and calling this to indicate desired sorts.
        //  we need to handle getting the server to sort the objects, by updating the listArgs
        assignReactiveObject(sorting.state.sorted, sorted);
    },
});
//TODO: a list of string as fields won't work for objectsGrid
const calculatedListFields = computed(() => {
    // if they don't pass listFields, use the modelConfig fields.
    //  modelConfig fields already falls back to models fields supplied by the server
    // return modelConfig.info.fields || [];
    if (props.listFields.length) {
        return props.listFields;
    } else if (modelConfig.config.listFields?.length) {
        return modelConfig.config.listFields;
    }
    return [];
});
const calculatedDisplayFields = computed(() => {
    if (props.displayFields) {
        return props.displayFields;
    } else if (modelConfig.config.listFields?.length) {
        return Object.keys(modelConfig.info.fields)
            .filter((key) => modelConfig.config.listFields.includes(key))
            .reduce((obj, key) => {
                obj[key] = modelConfig.info.fields[key];
                return obj;
            }, {});
    } else if (modelConfig.info.fields?.length) {
        return modelConfig.info.fields;
    }
    return [];
});
const validAndActive = computed(() => !!(isActive.value && props.app && props.model));
const listState = reactive({
    currentPage: 1,
    search: "",
    listArgs: {
        o: toRef(sorting.state, "sorted"),
    },
    filterArgs: {},
});
const instanceListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    retrieveArgs: {
        f: calculatedListFields,
    },
    listArgs: toRef(listState, "listArgs"),
    intendToList: validAndActive,
    // intendToSubscribe: validAndActive,
    relatedObjectsRules: toRef(props, "relatedObjectsRules"),
    calculatedObjectsRules: toRef(props, "calculatedObjectsRules"),
});
const instanceList = useList({
    props: instanceListProps,
    paged: true,
});
watch(toRef(listState, "search"), (newSearch, oldSearch) => {
    if (newSearch !== oldSearch) {
        listState.currentPage = 1;
    }
});
watch([toRef(listState, "currentPage"), toRef(listState, "search")], ([newPage, newSearch]) => {
    if (newPage <= 1 || newPage > instanceList.state.totalPages) {
        if (newPage !== 1) {
            // if there are no valid pages, just set 1 the once.
            newPage = listState.currentPage = 1;
        }
    }
    if (newPage === 1) {
        delete listState.listArgs[props.pageKey];
    } else {
        listState.listArgs[props.pageKey] = newPage;
    }
    if (!newSearch) {
        delete listState.listArgs[props.searchKey];
    } else {
        listState.listArgs[props.searchKey] = newSearch;
    }
});
watch(
    toRef(props, "listArgs"),
    () => {
        assignReactiveObject(listState.listArgs, props.listArgs, [...Object.keys(listState.filterArgs), "o"]);
    },
    { deep: true, immediate: true },
);
watch(
    () => cloneDeep(listState.filterArgs),
    (newFilter, oldFilter) => {
        if (!isEqual(newFilter, oldFilter)) {
            listState.currentPage = 1;
        }
        Object.entries(listState.filterArgs).forEach(([key, value]) => {
            if (value instanceof Date) {
                const rawFilterArgs = toRaw(listState.filterArgs);
                const updatedFilterArgs = { ...rawFilterArgs, [key]: value.toISOString().split("T")[0] };
                listState.filterArgs = updatedFilterArgs;
            }
        });
        assignReactiveObject(listState.listArgs, listState.filterArgs, [
            ...Object.keys(props.listArgs),
            "o",
            props.searchKey,
        ]);
    },
    { deep: true },
);

const loading = computed(() => loadingCombine(instanceList.state.loading, modelConfig.loading));
const titleStr = computed(() => `List ${memoizedStartCase(modelConfig.info?.verbose_name_plural || "items")}`);
const errored = computed(() => modelConfig.errored || instanceList.state.errored);
const error = computed(() => modelConfig.error || instanceList.state.error);
const dismissError = () => {
    modelConfig.clearError();
    instanceList.clearError();
};
const formContextProps = reactive({
    initialValues: {},
});
const formContext = useForm(formContextProps);
const filterList = () => {
    listState.search = listSearch.value;
    listState.filterArgs = cloneDeep(formContext.state.values);
};
const clickClearFilter = () => {
    formContext.reset();
    listState.filterArgs = {};
    listSearch.value = "";
    listState.search = "";
};
const selectedObjects = ref([]);

const router = useRouter();
const detailActionOnClick = (actionName) => {
    return async () => {
        await router.push(
            getCRUDForTo({
                app: props.app,
                model: props.model,
                pk: unref(selectedObjects),
                view: actionName,
            }),
        );
    };
};
const emit = defineEmits(["selected", "sorted", "objects", "order", "loading"]);
onMounted(() => {
    emit(
        "objects",
        toRef(() => instanceList.state.objects),
    );
    emit(
        "order",
        toRef(() => instanceList.state.order),
    );
    emit(
        "sorted",
        toRef(() => sorting.state.sorted),
    );
    emit("selected", readonly(selectedObjects));
    emit("loading", loading);
});
</script>
<template>
    <div>
        <page-title :loading="instanceList.state.loading" :title="titleStr">
            <template #button>
                <template
                    v-for="actionName in modelConfig.config.listActions"
                    :key="
                        getCRUDName({
                            app: app,
                            model: model,
                            view: actionName,
                        })
                    "
                >
                    <slot
                        name="targetless-action-button"
                        v-bind="{ model, app, view: actionName, label: memoizedStartCase(actionName) }"
                    >
                        <link-model-view
                            :app="app"
                            :label="memoizedStartCase(actionName)"
                            :model="model"
                            :view="actionName"
                        />
                    </slot>
                </template>
            </template>
            <template #subtitle>
                <div class="flex gap-1 w-full">
                    <InputGroup>
                        <InputText
                            v-model="listSearch"
                            class="max-w-[30ch]"
                            name="search"
                            placeholder="Search"
                            type="search"
                            @search="filterList"
                        />
                        <slot :click="filterList" label="Search" name="button" verb="search">
                            <Button label="Search" @click="filterList" />
                        </slot>
                    </InputGroup>
                </div>
            </template>
            <template #under-actions>
                <div class="flex gap-1 w-full justify-end">
                    <template v-for="actionName in modelConfig.config.detailActions" :key="actionName">
                        <slot
                            name="bulk-action-button"
                            v-bind="{
                                model,
                                app,
                                view: actionName,
                                label: memoizedStartCase(actionName),
                                click: detailActionOnClick(actionName),
                                selectedObjects,
                            }"
                        >
                            <link-model-view
                                :app="app"
                                button
                                :label="memoizedStartCase(actionName)"
                                :model="model"
                                :pk="selectedObjects"
                                :view="actionName"
                            />
                        </slot>
                    </template>
                </div>
            </template>
        </page-title>
        <div class="flex gap-2 lg:gap-4 my-1 items-center justify-end w-full">
            <form :ref="filterFormModelRef" class="w-full" @submit.prevent="filterList">
                <filter-form-model :app="app" :filter-fields="listFields" :model="model" v-bind="$attrs" />
            </form>
            <slot :click="clickClearFilter" label="Clear Filters" name="button" verb="clearFilters">
                <Button
                    class="whitespace-nowrap"
                    label="Clear Filters"
                    severity="secondary"
                    @click="clickClearFilter"
                />
            </slot>
        </div>
        <error-display :error="error" :errored="errored" @dismiss-error="dismissError" />
        <!-- todo: filters/search -->
        <!-- todo: hide/show columns -->
        <!-- todo: filters return here? @submit=filterList -->
        <slot name="before-list" />
        <objects-grid
            ref="objectsGridRef"
            v-bind="$attrs"
            v-model:selected="selectedObjects"
            :calculated-objects="instanceList.state.calculatedObjects"
            :data-qa="`view-list-${app}-${model}-objects-grid`"
            :fields="calculatedDisplayFields"
            :loading="loading"
            :objects-in-order="instanceList.state.objectsInOrder"
            :related-objects="instanceList.state.relatedObjects"
            selectable
            :sortable="sorting.state.sortable"
            :sorted="sorting.state.sorted"
            :variant="objectGridVariant"
            @update:sorted="sorting.updateSorted"
        >
            <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </objects-grid>
        <pagination-component
            v-model:currentPage="listState.currentPage"
            :rows="instanceList.state.perPage"
            :total-records="instanceList.state.totalRecords"
        ></pagination-component>
    </div>
</template>
