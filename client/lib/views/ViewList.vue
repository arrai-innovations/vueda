<script setup>
import { assignReactiveObject, keyDiff, loadingCombine, union, useList } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FilterGroup from "@vueda/components/FilterGroup.vue";
import FormFeedback from "@vueda/components/FormFeedback.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import PaginationComponent from "@vueda/components/PaginationComponent.vue";
import StickyBar from "@vueda/components/StickyBar.vue";
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { useFilteredActions } from "@vueda/use/useFilteredActions";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { getCRUDName, memoizedStartCase } from "@vueda/utils/case.js";
import { EXPAND_PARAM, FIELDS_PARAM, ORDERING_PARAM, PAGE_PARAM, SEARCH_PARAM } from "@vueda/utils/constants.js";
import { ListFilterError } from "@vueda/utils/errors.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import InputGroup from "primevue/inputgroup";
import InputText from "primevue/inputtext";
import { computed, effectScope, inject, onMounted, reactive, readonly, ref, toRef, toRefs, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

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
    params: {
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
    filterFormsValues: {
        type: Object,
        default: () => ({}),
    },
    filterables: {
        type: Array,
        default: undefined,
    },
    filterableDetails: {
        type: Object,
        default: () => ({}),
    },
    ...THEME_OVERRIDE_PROPS,
});
const listSearch = ref(null);
const isActive = useIsActive();
const validAndActive = computed(() => !!(isActive.value && props.app && props.model && modelConfig.loading === false));
const viewName = "list";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);

if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}

const selectedObjects = ref([]);
const workflow = useWorkflowTransitions(toRef(props, "app"), toRef(props, "model"), isActive);
const router = useRouter();
const route = useRoute();
const sorting = reactive({
    state: {
        sortables: computed(() => modelConfig?.config?.sortables),
        sorted: [],
    },
    updateSorted: (sorted) => {
        assignReactiveObject(sorting.state.sorted, sorted);
    },
});
const pkKey = computed(() => modelConfig.info?.pk ?? "id");
const calculatedListFields = computed(() => {
    let fields = [];
    if (props.listFields.length) {
        fields = [...props.listFields];
    } else if (modelConfig.config.fetchFields?.length) {
        fields = [...modelConfig.config.fetchFields];
    }
    const unrefPKKey = unref(pkKey);
    if (!fields.includes(unrefPKKey)) {
        fields.unshift(unrefPKKey);
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
const alwaysParamsKeys = ["o", "f", "e"];
const listState = reactive({
    currentPage: 1,
    search: "",
    params: {
        [ORDERING_PARAM]: toRef(sorting.state, "sorted"),
        [FIELDS_PARAM]: calculatedListFields,
        [EXPAND_PARAM]: computed(() => modelConfig.config?.expand),
    },
    filterArgs: {},
});
const instanceListProps = reactive({
    target: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    params: toRef(listState, "params"),
    intendToList: validAndActive,
    // intendToSubscribe: validAndActive,
    relatedObjectsRules: toRef(props, "relatedObjectsRules"),
    calculatedObjectsRules: toRef(props, "calculatedObjectsRules"),
});
const instanceList = useList({
    props: instanceListProps,
    paged: true,
    keepOldPages: false,
    clearListOnListIntentTriggered: false, // don't retrigger the objects grid skeleton when we change page number
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
        delete listState.params[PAGE_PARAM];
    } else {
        listState.params[PAGE_PARAM] = newPage;
    }
    if (!newSearch) {
        delete listState.params[SEARCH_PARAM];
        const routeQuery = omit(route.query, [SEARCH_PARAM]);
        router.push({ query: routeQuery });
    } else {
        listState.params[SEARCH_PARAM] = newSearch;
        const routeQuery = { ...route.query, [SEARCH_PARAM]: newSearch };
        if (!isEqual(routeQuery, route.query)) {
            router.push({ query: routeQuery });
        }
    }
});
watch(
    () => route.query,
    (newQuery) => {
        const searchQuery = newQuery[SEARCH_PARAM] || "";
        if (!isEqual(searchQuery, listState.search)) {
            listSearch.value = searchQuery;
            listState.search = searchQuery;
        }
    },
    { immediate: true },
);
watch(
    toRef(props, "params"),
    () => {
        assignReactiveObject(listState.params, props.params, [
            ...Object.keys(listState.filterArgs),
            ...alwaysParamsKeys,
        ]);
    },
    { deep: true, immediate: true },
);

watch(
    () => cloneDeep(listState.filterArgs),
    (newFilter, oldFilter) => {
        if (!isEqual(newFilter, oldFilter)) {
            listState.currentPage = 1;
        }
        assignReactiveObject(listState.params, listState.filterArgs, [
            ...Object.keys(props.params),
            ...alwaysParamsKeys,
            SEARCH_PARAM,
        ]);
        const filterQuery = omit(route.query, [SEARCH_PARAM]);
        if (!isEqual(newFilter, filterQuery)) {
            const routeQuery = {
                [SEARCH_PARAM]: route.query[SEARCH_PARAM],
                ...newFilter,
            };
            router.push({ query: routeQuery });
        }
    },
    { deep: true },
);

const loading = computed(() => loadingCombine(instanceList.state.loading, modelConfig.loading));
const titleStr = computed(() => `List ${memoizedStartCase(modelConfig.config?.verboseNamePlural || "items")}`);
const errored = computed(() =>
    modelConfig.errored || (instanceList.state.errored && !(instanceList.state.error instanceof ListFilterError))
        ? instanceList.state.errored
        : false,
);
const error = computed(() =>
    modelConfig.error || (instanceList.state.error && !(instanceList.state.error instanceof ListFilterError))
        ? instanceList.state.error
        : null,
);

const dismissError = () => {
    modelConfig.clearError();
    instanceList.clearError();
};

const filterList = () => {
    listState.search = listSearch.value;
};

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
    "filter-change",
    "query-change",
    "hide-filter-form",
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
    return new Set(workflow.transitions.map((transition) => transition.name));
});

const translateExpandedField = (field) => {
    // model config display fields uses django double underscore notation for expanded fields
    // but objects-grid expects dot notation
    // to preserve slot names, we don't want to change the field's 'name'.
    // but we can override the 'value' to be the dot notation, if not otherwise specified
    if (field?.name?.includes("__")) {
        return {
            ...field,
            value: field.value || field.name.replace(/__/g, "."),
        };
    }
    return field;
};

const computedFieldObjects = computed(() => {
    const result = [];
    for (const field of props.extraFieldObjects) {
        result.push(translateExpandedField(field));
    }
    for (const field of calculatedDisplayFields.value) {
        result.push(translateExpandedField(field));
    }
    return result;
});
const specialSlots = props.extraFieldObjects.map((field) => `field(${field.name})`);
const themeOverride = computed(() => {
    return props.themeOverride?.["ViewList"];
});
const theme = useTheme(
    "ViewList",
    props,
    reactive({
        ...toRefs(props),
        loading,
        errored,
        error,
    }),
);
const filteredActions = useFilteredActions({
    modelConfigInstance: modelConfig,
});
const targetlessActionButtonSlotName = useSlotNameResolver(["targetless-action-button", "button"]);
const bulkActionButtonSlotName = useSlotNameResolver(["bulk-action-button", "button"]);
const workflowActionButtonSlotName = useSlotNameResolver(["workflow-action-button", "button"]);
const targetlessActions = computed(() => {
    const actions = filteredActions.actions || [];
    const actionDetails = modelConfig.config?.actionDetails || {};
    return new Set(
        actions.filter((name) => {
            const actionDetail = actionDetails[name];
            return actionDetail && viewName !== name && !actionDetail.detail && !actionDetail.bulk;
        }),
    );
});

const bulkActions = computed(() => {
    const actions = filteredActions.actions || [];
    const actionDetails = modelConfig.config?.actionDetails || {};
    return new Set(actions.filter((name) => actionDetails[name]?.bulk));
});

const buttonSlotProps = reactive({});
const bspEffectScope = effectScope();
watch(
    [bulkActions, targetlessActions, availableTransitions],
    ([newBulkActions, newTargetlessActions, newTransitions]) => {
        const bulkActionSet = newBulkActions || new Set();
        const targetlessActionSet = newTargetlessActions || new Set();
        const availableTransitionsSet = newTransitions || new Set();
        const { addedKeys, removedKeys } = keyDiff(
            union(union(bulkActionSet, targetlessActionSet), availableTransitionsSet),
            Object.keys(buttonSlotProps),
        );
        for (const addedKey of addedKeys) {
            const isBulk = bulkActionSet.has(addedKey) || availableTransitionsSet.has(addedKey);
            bspEffectScope.run(() => {
                buttonSlotProps[addedKey] = {
                    app: toRef(props, "app"),
                    model: toRef(props, "model"),
                    view: addedKey,
                    label: memoizedStartCase(addedKey),
                    click: isBulk ? detailActionOnClick(addedKey) : undefined,
                    selectedObjects: isBulk ? selectedObjects : undefined,
                    disabled: isBulk ? computed(() => (!addedKey) in availableTransitions.value) : undefined,
                    class: isBulk ? theme("bulkActionButton") : theme("targetlessActionButton"),
                };
            });
        }
        for (const removedKey of removedKeys) {
            if (buttonSlotProps[removedKey].disabled) {
                // internal vue api, but if we are here, we are deleting before the end of the scope
                buttonSlotProps[removedKey].disabled.effect?.stop();
            }
            delete buttonSlotProps[removedKey];
        }
    },
    { immediate: true },
);
const searchSlotProps = reactive({
    app: toRef(props, "app"),
    model: toRef(props, "model"),
    verb: "search",
    label: "Search",
    filterList,
    listSearch,
    updateListSearch: (value) => {
        listSearch.value = value;
    },
    searchInputClass: theme("searchInput"),
});
</script>
<template>
    <div>
        <page-title :loading="instanceList.state.loading" :title="titleStr">
            <template #button>
                <template
                    v-for="actionName in targetlessActions"
                    :key="getCRUDName({ app: app, model: model, view: actionName })"
                >
                    <slot :name="targetlessActionButtonSlotName.name" v-bind="buttonSlotProps[actionName]">
                        <link-model-view v-bind="buttonSlotProps[actionName]" />
                    </slot>
                </template>
            </template>
            <template #under-actions>
                <div :class="theme('underActionsBar')" data-qa="view-list-under-actions">
                    <div :class="theme('actionButtonGroupBar')" data-qa="view-list-action-buttons">
                        <template v-for="actionName in bulkActions" :key="actionName">
                            <slot :name="bulkActionButtonSlotName.name" v-bind="buttonSlotProps[actionName]">
                                <link-model-view
                                    button
                                    :pk="buttonSlotProps[actionName].selectedObjects"
                                    v-bind="omit(buttonSlotProps[actionName], ['selectedObjects'])"
                                />
                            </slot>
                        </template>
                        <template v-for="actionName in availableTransitions" :key="actionName">
                            <slot :name="workflowActionButtonSlotName.name" v-bind="buttonSlotProps[actionName]">
                                <link-model-view
                                    button
                                    :pk="buttonSlotProps[actionName].selectedObjects"
                                    v-bind="omit(buttonSlotProps[actionName], ['selectedObjects'])"
                                />
                            </slot>
                        </template>
                    </div>
                    <div class="flex flex-col items-end">
                        <slot name="search" v-bind="searchSlotProps">
                            <InputGroup>
                                <InputText
                                    :class="theme('searchInput')"
                                    :model-value="searchSlotProps.listSearch"
                                    name="search"
                                    placeholder="Search"
                                    type="search"
                                    @search="searchSlotProps.filterList"
                                    @update:model-value="searchSlotProps.updateListSearch"
                                />
                                <Button label="Search" @click="searchSlotProps.filterList" />
                            </InputGroup>
                        </slot>
                    </div>
                </div>
            </template>
        </page-title>
        <sticky-bar :class="theme('filterGroupBar')">
            <filter-group
                v-model="listState.filterArgs"
                :app="props.app"
                :model="props.model"
                :view="viewName"
                :error="instanceList.state.error"
                :errored="instanceList.state.errored"
                :filter-forms-values="props.filterFormsValues"
                :filterable-details="props.filterableDetails"
                :filterables="props.filterables"
                @filter-change="emit('filter-change', $event)"
                @hide-filter-form="emit('hide-filter-form', $event)"
                @query-change="emit('query-change', $event)"
            >
                <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </filter-group>
        </sticky-bar>

        <slot name="additional-errors" />
        <error-display :error="error" :errored="errored" @dismiss-error="dismissError" />
        <!-- todo: filters/search -->
        <!-- todo: hide/show columns -->
        <!-- todo: filters return here? @submit=filterList -->
        <slot name="before-list">
            <div class="max-w-full overflow-x-auto p-1 flex flex-col gap-2">
                <form-feedback type="error" />
                <form-feedback type="message" />
            </div>
        </slot>
        <objects-grid
            v-bind="$attrs"
            :calculated-objects="instanceList.state.calculatedObjects"
            :class="theme('objectsGrid')"
            :field-classes="{
                ...($attrs.fieldClasses || {}),
                selected_: theme('selectedCheckbox'),
            }"
            :field-props="{
                pkKey: modelConfig.info?.pk ?? 'id',
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
            @update:sorted="sorting.updateSorted"
        >
            <template
                v-for="slot in Object.keys($slots).filter((slot) => !specialSlots.includes(slot))"
                #[slot]="slotProps"
            >
                <slot :name="slot" v-bind="slotProps || {}"></slot>
            </template>
            <template v-for="field in extraFieldObjects" :key="field.name" #[`header(${field.name})`]="slotProps">
                <slot :name="`field(${field.name})`" v-bind="slotProps">
                    <div :class="slotProps.class" :data-card-header="field.name">
                        {{ slotProps.girdType === "cell" ? field.label : "" }}
                    </div>
                </slot>
            </template>
            <template v-for="field in extraFieldObjects" :key="field.name" #[`field(${field.name})`]="slotProps">
                <slot
                    v-bind="slotProps"
                    :has-selectable-actions="bulkActions.size || availableTransitions.size"
                    :name="`field(${field.name})`"
                >
                    <Checkbox
                        v-if="bulkActions.size || availableTransitions.size"
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
            :loading="instanceList.state.loading"
            :rows="instanceList.state.perPage"
            :total-records="instanceList.state.totalRecords"
        ></pagination-component>
    </div>
</template>
