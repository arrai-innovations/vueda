<script setup>
import { loadingCombine, useList } from "@arrai-innovations/reactive-helpers";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import PaginationComponent from "@vueda/components/PaginationComponent.vue";
import { ControlButton } from "@vueda/controls/button";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { FIELDS_PARAM } from "@vueda/utils/constants.js";
import { allPagePaginatedListCrudAdaptor, singlePagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
import { DateTime } from "luxon";
import { computed, inject, reactive, ref, toRef, useSlots, watch } from "vue";
import { useRouter } from "vue-router";

/**
 * Paginated list view showing the history audit trail for a specific model instance,
 * displaying field-level changes with old and new values in a table or card layout.
 *
 * @vueda-slot-forward PaginationComponent
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name used to resolve API endpoints and configuration. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key of the instance whose history is displayed. */
    pk: {
        type: String,
        required: true,
    },
    /** Query parameter name used to track the current page in the URL. */
    pageKey: {
        type: String,
        default: "p",
    },
    /** Tailwind breakpoint at which the layout switches from card to table view. */
    tableBreakpoint: {
        type: String,
        default: "lg",
    },
    /** Ordered list of field names to display as columns in the history table. */
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
    /** When true, shows a control that lets the user load all history pages at once. */
    allowShowAllPages: {
        type: Boolean,
        default: true,
    },
    /** When true, always fetches and displays all history pages without requiring user interaction. */
    alwaysShowAllPages: {
        type: Boolean,
        default: false,
    },
    /** When true, displays the total number of history records in the pagination bar. */
    showTotalRecordNum: {
        type: Boolean,
        default: true,
    },
});
const isTable = ref(true);
const handleIsTableUpdate = (newValue) => {
    isTable.value = newValue;
};
const viewName = "history-list";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);

if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}

const isActive = useIsActive();
const validAndActive = computed(() => !!(isActive.value && props.app && props.model && modelConfig.loading === false));
const currentPage = ref(1);
const modelListProps = reactive({
    target: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
        pk: toRef(props, "pk"),
        action: "history_list",
    },
    pkKey: "history_id",
    params: {
        [props.pageKey]: currentPage,
        [FIELDS_PARAM]: ["history"],
    },
    intendToList: validAndActive,
});

const instanceList = useList({
    props: modelListProps,
    handlers: {
        list: (...args) =>
            computedShowAllPages.value
                ? allPagePaginatedListCrudAdaptor(...args)
                : singlePagePaginatedListCrudAdaptor(...args),
    },
});

const showingAllPages = ref(false);
const computedShowAllPages = computed(() => (props.alwaysShowAllPages ? true : showingAllPages.value));
watch(computedShowAllPages, (newVal, oldVal) => {
    if (newVal !== oldVal) {
        currentPage.value = 1;
        instanceList.clearList();
        instanceList.list();
    }
});
watch([validAndActive, currentPage], () => {
    instanceList.clearList({ keepPagination: true });
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
    const historyFields = modelConfig.info?.expand?.filter((expand) => expand.name === "history")[0]?.f;
    return historyFields ? Object.entries(historyFields).map(([key, value]) => ({ name: key, ...value })) : [];
});
const computedFieldObjects = computed(() => {
    return props.fields
        .map((field) => {
            return (
                calculatedHistoryFieldsObjects.value.find((f) => f.name === field) ||
                extraFieldObjects.value.find((f) => f.name === field)
            );
        })
        .filter(Boolean);
});
const calculatedHistoryFields = computed(() => {
    return calculatedHistoryFieldsObjects.value.map((field) => field.name);
});

const router = useRouter();
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
const theme = useTheme("ViewHistoryList");
const formatHistoryDate = (date) => {
    return date ? DateTime.fromISO(date).toLocaleString(DateTime.DATETIME_MED) : "";
};
const slots = useSlots();
</script>
<template>
    <div :class="theme('root')">
        <page-title :loading="instanceList.state.loading" :title="titleStr">
            <template #button>
                <ControlButton variant="ghost" @click="router.back()">Back</ControlButton>
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
                    pkKey: modelConfig.info?.pk ?? 'id',
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
                        {{ field === "history_date" ? formatHistoryDate(obj[field]) : obj[field] }}
                    </slot>
                </template>
                <template #field(new)="{ obj }">
                    <slot name="field(new)">
                        <template v-if="!isTable">
                            <div v-for="changed in obj.changes" :key="changed.field">
                                {{ changed.new }}
                            </div>
                        </template>
                        <template v-else>
                            <div>
                                {{ obj.new }}
                            </div>
                        </template>
                    </slot>
                </template>
                <template #field(old)="{ obj }">
                    <slot name="field(old)">
                        <template v-if="!isTable">
                            <div v-for="changed in obj.changes" :key="changed.field">
                                {{ changed.old }}
                            </div>
                        </template>
                        <template v-else>
                            <div>
                                {{ obj.old }}
                            </div>
                        </template>
                    </slot>
                </template>
            </objects-grid>
        </div>

        <pagination-component
            v-model:current-page="currentPage"
            :rows="instanceList.state.paginateInfo?.perPage || 1"
            :total-records="instanceList.state.paginateInfo?.totalRecords || 1"
            :is-table="isTable"
            :showing-all-pages="computedShowAllPages"
            :allow-show-all-pages="allowShowAllPages"
            :show-total-record-num="showTotalRecordNum"
            @update:showing-all-pages="showingAllPages = $event"
        >
            <template v-for="(_, slot) in slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </pagination-component>
    </div>
</template>
