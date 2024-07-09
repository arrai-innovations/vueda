<script setup>
import { assignReactiveObject, loadingCombine, useList } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import PaginationComponent from "@vueda/components/PaginationComponent.vue";
import { getCRUDName } from "@vueda/router/getCrud.js";
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { getCapitalizedTitle } from "@vueda/utils/crudSupport.js";
import Button from "primevue/button";
import { computed, reactive, toRef, watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    pageKey: {
        type: String,
        default: "p",
    },
    model: {
        type: String,
        required: true,
    },
    listFields: {
        type: Array,
        default: () => [],
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
    // as long as there are no collisions, $attrs can be used to pass through any other props to objects-grid
});

const isActive = useIsActive();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const sorting = reactive({
    state: {
        sortable: toRef(modelConfig.config, "listSortable"),
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
    // return modelConfig.info.model_fields || [];
    if (props.listFields.length) {
        return props.listFields;
    } else if (modelConfig.config.listFields?.length) {
        return modelConfig.config.listFields;
    }
    return [];
});
const calculatedListFieldsObjs = computed(() => {
    return modelConfig.info.model_fields?.filter((f) => calculatedListFields.value?.includes(f.name)) || [];
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
});
const instanceList = useList({
    props: instanceListProps,
    paged: true,
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

const loading = computed(() => loadingCombine(instanceList.state.loading, modelConfig.loading));
const combinedClasses = useCombinedClasses("ViewList", props);
const verboseNamePlural = computed(() => getCapitalizedTitle(modelConfig.info?.verbose_name_plural || "items"));
const errored = computed(() => modelConfig.errored || instanceList.state.errored);
const error = computed(() => modelConfig.error || instanceList.state.error);
const dismissError = () => {
    modelConfig.clearError();
    instanceList.clearError();
};
</script>

<template>
    <div class="flex flex-col gap-1 w-full max-w-full">
        <div class="prose dark:prose-invert">
            <h1 :class="combinedClasses.titleClass">
                {{ verboseNamePlural }}
                <loading-spinner-inline v-if="modelConfig.loading" :class="combinedClasses.loadingClass" />
            </h1>
        </div>
        <error-display :error="error" :errored="errored" @dismiss-error="dismissError" />
        <!-- todo: filters/search -->
        <!-- todo: pagination -->
        <!-- todo: hide/show columns -->
        <!-- todo: collection level actions -->
        <div :class="combinedClasses.listActionsClass">
            <div
                v-for="actionName in modelConfig.config.listActions"
                :key="actionName"
                :class="combinedClasses.listActionClass"
            >
                <router-link v-slot="{ navigate }" custom :to="{ name: getCRUDName({ app, model, view: actionName }) }">
                    <Button class="w-full" :label="actionName" @click="navigate" />
                </router-link>
            </div>
        </div>
        <!-- todo: bulk object level actions -->
        <div :class="combinedClasses.detailActionsClass">
            <div
                v-for="actionName in modelConfig.config.detailActions"
                :key="actionName"
                :class="combinedClasses.detailActionClass"
            >
                <!-- todo: action buttons -->
                {{ actionName }}
            </div>
        </div>
        <!-- todo: a column that allows selecting objects for bulk detail actions -->
        <objects-grid
            ref="objectsGridRef"
            v-bind="$attrs"
            :calculated-objects="instanceList.state.calculatedObjects"
            :data-qa="`view-list-${app}-${model}-objects-grid`"
            :fields="calculatedListFieldsObjs"
            :loading="loading"
            :objects-in-order="instanceList.state.objectsInOrder"
            :related-objects="instanceList.state.relatedObjects"
            :sortable="sorting.state.sortable"
            :sorted="sorting.state.sorted"
            :variant="objectGridVariant"
            @update:sorted="sorting.updateSorted"
        >
            <template #link-field="{ pk, value }">
                <link-model-view :app="app" :model="model" :pk="pk" view="read">
                    {{ value }}
                </link-model-view>
            </template>
        </objects-grid>
        <pagination-component
            v-model:currentPage="listState.currentPage"
            :rows="instanceList.state.perPage"
            :total-records="instanceList.state.totalRecords"
        ></pagination-component>
    </div>
</template>
