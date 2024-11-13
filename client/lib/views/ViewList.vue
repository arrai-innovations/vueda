<script setup>
import { assignReactiveObject, loadingCombine, useList } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FilterForm from "@vueda/components/FilterForm.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import PaginationComponent from "@vueda/components/PaginationComponent.vue";
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { useForm } from "@vueda/use/useForm.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useWorkflow } from "@vueda/use/useWorkflow.js";
import { getCRUDName, memoizedStartCase } from "@vueda/utils/crudSupport.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEqual from "lodash-es/isEqual.js";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
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
        type: Object,
        default: () => ({}),
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
    retrieveArgs: {
        type: Object,
        default: () => ({}),
    },
    // as long as there are no collisions, $attrs can be used to pass through any other props to objects-grid
    tableBreakpoint: {
        type: String,
        default: "lg",
    },
    extraFieldObjects: {
        type: Array,
        default: () => [
            {
                name: `selected_`,
                extra: true,
                label: "Selected",
            },
        ],
    },
    ...THEME_OVERRIDE_PROPS,
});
const listSearch = ref(null);
const isActive = useIsActive();
const viewName = "list";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);
const sorting = reactive({
    state: {
        sortables: computed(() => modelConfig?.config?.sortables),
        sorted: [],
    },
    updateSorted: (sorted) => {
        assignReactiveObject(sorting.state.sorted, sorted);
    },
});
const calculatedListFields = computed(() => {
    let fields = [];
    if (props.listFields.length) {
        fields = [...props.listFields];
    } else if (modelConfig.config.fetchFields?.length) {
        fields = [...modelConfig.config.fetchFields];
    }
    if (!fields.includes(modelConfig.info?.pk)) {
        fields.unshift(modelConfig.info?.pk);
    }
    return fields;
});
const calculatedDisplayFields = computed(() => {
    if (Object.keys(props.displayFields).length) {
        return Object.values(props.displayFields);
    } else {
        return (
            modelConfig.config.displayFields?.map((f) => ({
                name: f,
                ...modelConfig.config.fieldDetails[f],
            })) || []
        );
    }
});
const validAndActive = computed(() => !!(isActive.value && props.app && props.model && modelConfig.info?.pk));
const listState = reactive({
    currentPage: 1,
    search: "",
    listArgs: {
        o: toRef(sorting.state, "sorted"),
        f: calculatedListFields,
        e: modelConfig.config?.expands,
    },
    filterArgs: {},
});
const instanceListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    retrieveArgs: {},
    listArgs: toRef(listState, "listArgs"),
    intendToList: validAndActive,
    // intendToSubscribe: validAndActive,
    relatedObjectsRules: toRef(props, "relatedObjectsRules"),
    calculatedObjectsRules: toRef(props, "calculatedObjectsRules"),
});
const instanceList = useList({
    props: instanceListProps,
    paged: true,
    keepOldPages: false,
    clearListOnListIntentTriggered: true,
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
        assignReactiveObject(listState.listArgs, props.listArgs, [...Object.keys(listState.filterArgs), "o", "f"]);
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
                listState.filterArgs = { ...rawFilterArgs, [key]: value.toISOString().split("T")[0] };
            }
        });
        assignReactiveObject(listState.listArgs, listState.filterArgs, [
            ...Object.keys(props.listArgs),
            "o",
            "f",
            props.searchKey,
        ]);
    },
    { deep: true },
);

const loading = computed(() => loadingCombine(instanceList.state.loading, modelConfig.loading));
const titleStr = computed(() => `List ${memoizedStartCase(modelConfig.config?.verboseNamePlural || "items")}`);
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
const selectedObjects = ref([]);
const workflow = useWorkflow(toRef(props, "app"), toRef(props, "model"), selectedObjects, isActive, validAndActive);
const router = useRouter();
const detailActionOnClick = (actionName) => {
    return async () => {
        await router.push(
            await getCRUDForTo({
                app: props.app,
                model: props.model,
                pk: unref(selectedObjects),
                view: actionName,
            }),
        );
    };
};
const emit = defineEmits([
    "selected",
    "sorted",
    "objects",
    "order",
    "loading",
    "related-objects",
    "calculated-objects",
]);
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
    emit("related-objects", readonly(instanceList.state.relatedObjects));
    emit("calculated-objects", readonly(instanceList.state.calculatedObjects));
});

const availableTransitions = computed(() => {
    if (selectedObjects.value.length) {
        const transitions = Object.keys(workflow.objectTransitions)
            .filter((key) => selectedObjects.value.includes(Number(key)))
            .flatMap((key) => workflow.objectTransitions[key]);
        return transitions;
    }
    return [];
});

const computedFieldObjects = computed(() => {
    return [...props.extraFieldObjects, ...calculatedDisplayFields.value];
});
const specialSlots = props.extraFieldObjects.map((field) => `field(${field.name})`);
const theme = useTheme("ViewList", props, {
    props,
    loading,
    errored,
    error,
});
</script>
<template>
    <div>
        <page-title :loading="instanceList.state.loading" :title="titleStr">
            <template #button>
                <template
                    v-for="actionName in modelConfig.config?.actions?.filter((name) => {
                        const actionDetail = modelConfig.config?.actionDetails?.[name];
                        return actionDetail && viewName !== name && !actionDetail.detail && !actionDetail.bulk;
                    })"
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
        </page-title>
        <div class="w-full flex flex-col sm:flex-row sm:justify-between items-baseline gap-1">
            <div class="flex flex-wrap gap-1 w-full">
                <template
                    v-for="actionName in modelConfig.config?.actions?.filter(
                        (name) =>
                            modelConfig.config?.actionDetails?.[name] && modelConfig.config?.actionDetails?.[name].bulk,
                    )"
                    :key="actionName"
                >
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
                            class="grow sm:grow-0"
                            :disabled="!availableTransitions.includes(actionName)"
                            :label="memoizedStartCase(actionName)"
                            :model="model"
                            :pk="selectedObjects"
                            :view="actionName"
                        />
                    </slot>
                </template>
            </div>
            <div class="flex flex-col items-end">
                <slot
                    name="search"
                    v-bind="{
                        listSearch,
                        filterList,
                        model,
                        app,
                        viewName,
                        verb: 'search',
                        label: 'Search',
                    }"
                >
                    <InputGroup>
                        <InputText
                            v-model="listSearch"
                            class="lg:max-w-[30ch]"
                            name="search"
                            placeholder="Search"
                            type="search"
                            @search="filterList"
                        />
                        <Button label="Search" @click="filterList" />
                    </InputGroup>
                </slot>
                <filter-form v-model="listState.filterArgs" :app="app" :model="model" :view="viewName">
                    <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                        <slot :name="slot" v-bind="slotProps || {}" />
                    </template>
                </filter-form>
            </div>
        </div>
        <error-display :error="error" :errored="errored" @dismiss-error="dismissError" />
        <!-- todo: filters/search -->
        <!-- todo: hide/show columns -->
        <!-- todo: filters return here? @submit=filterList -->
        <slot name="before-list" />
        <objects-grid
            v-bind="$attrs"
            :calculated-objects="instanceList.state.calculatedObjects"
            class="w-full"
            :data-qa="`view-list-${app}-${model}-objects-grid`"
            :field-classes="{
                ...($attrs.fieldClasses || {}),
                selected_: theme('selectedCheckbox'),
            }"
            :field-props="{
                pkKey: modelConfig.info?.pk,
                modelInfo: modelConfig.info,
                modelConfig: modelConfig.config,
            }"
            :fields="computedFieldObjects"
            :loading="loading"
            :objects-in-order="instanceList.state.objectsInOrder"
            :related-objects="instanceList.state.relatedObjects"
            :sortables="sorting.state.sortables"
            :sorted="sorting.state.sorted"
            :table-breakpoint="tableBreakpoint"
            :theme-override="themeOverride"
            :variant="objectGridVariant"
            @update:sorted="sorting.updateSorted"
        >
            <template
                v-for="slot in Object.keys($slots).filter((slot) => !specialSlots.includes(slot))"
                #[slot]="slotProps"
            >
                <slot :name="slot" v-bind="slotProps || {}"> </slot>
            </template>
            <template v-for="field in extraFieldObjects" :key="field.name" #[`header(${field.name})`]="slotProps">
                <slot :name="`field(${field.name})`" v-bind="slotProps">
                    <div :class="slotProps.class" :data-card-header="field.name">
                        {{ slotProps.girdType === "cell" ? field.label : "" }}
                    </div>
                </slot>
            </template>
            <template v-for="field in extraFieldObjects" :key="field.name" #[`field(${field.name})`]="slotProps">
                <slot :name="`field(${field.name})`" v-bind="slotProps">
                    <Checkbox
                        v-model="selectedObjects"
                        :input-id="`selected-row-${slotProps.pk}`"
                        name="selected"
                        v-bind="slotProps"
                        :value="slotProps.pk"
                    />
                </slot>
            </template>
        </objects-grid>
        <pagination-component
            v-model:current-page="listState.currentPage"
            :rows="instanceList.state.perPage"
            :total-records="instanceList.state.totalRecords"
        ></pagination-component>
    </div>
</template>
