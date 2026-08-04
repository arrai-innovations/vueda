<script setup>
import { loadingCombine, useList } from "@arrai-innovations/reactive-helpers";
import Button from "@vueda/controls/button/Button.vue";
import UserAvatar from "@vueda/display/avatar/UserAvatar.vue";
import PaginationFooter from "@vueda/navigation/pagination/PaginationFooter.vue";
import ObjectsGrid from "@vueda/objects-grid/ObjectsGrid.vue";
import PageActions from "@vueda/shell/page-title/PageActions.vue";
import "@vueda/theme/vueda-tailwind/views/ViewHistoryList.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import {
    ALL_PAGES,
    DEFAULT_PAGE_SIZE,
    DEFAULT_PAGE_SIZE_OPTIONS,
    FIELDS_PARAM,
    PAGE_PARAM,
    PAGE_SIZE_PARAM,
} from "@vueda/utils/constants.js";
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
 * @vueda-slot-forward PaginationFooter
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
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
    /** Tailwind breakpoint at which the layout switches from card to table view. */
    tableBreakpoint: {
        type: String,
        default: "lg",
    },
    /** When true, hides the meta strip + layout toggle row above the grid. */
    hideMetaStrip: {
        type: Boolean,
        default: false,
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
    /** Rows-per-page options offered by the pagination footer; the final `"all"` entry loads every history page at once. */
    pageSizeOptions: {
        type: Array,
        default: () => [...DEFAULT_PAGE_SIZE_OPTIONS],
    },
    /** Initial rows-per-page (a number, or `"all"`). */
    defaultPageSize: {
        type: [Number, String],
        default: DEFAULT_PAGE_SIZE,
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
// User-driven layout override for the meta-strip toggle. "auto" defers to the responsive
// breakpoint; "table"/"cards" force a layout by remapping ObjectsGrid's tableBreakpoint to
// sentinels that are always-or-never matched ("xs" always matches, "inf" never does).
const layoutOverride = ref("auto");
const effectiveTableBreakpoint = computed(() => {
    if (layoutOverride.value === "table") return "xs";
    if (layoutOverride.value === "cards") return "inf";
    return props.tableBreakpoint;
});
const setLayoutOverride = (mode) => {
    layoutOverride.value = mode;
};
const viewName = "history-list";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);

if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}

const isActive = useIsActive();
const validAndActive = computed(() => !!(isActive.value && props.app && props.model && modelConfig.loading === false));
const currentPage = ref(1);
// Seed rows-per-page from the configured default, validated against the offered options. History is
// transient, so the selection is not persisted (it resets each visit).
const seededPerPage = props.pageSizeOptions.includes(props.defaultPageSize) ? props.defaultPageSize : DEFAULT_PAGE_SIZE;
const perPage = ref(seededPerPage);
const modelListProps = reactive({
    target: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
        pk: toRef(props, "pk"),
        action: "history_list",
    },
    pkKey: "history_id",
    params: {
        [PAGE_PARAM]: currentPage,
        [FIELDS_PARAM]: ["history"],
    },
    intendToList: validAndActive,
});
// Always send the page size for a numeric selection so the server's `perPage` matches the choice.
if (seededPerPage !== ALL_PAGES) {
    modelListProps.params[PAGE_SIZE_PARAM] = seededPerPage;
}

const instanceList = useList({
    props: modelListProps,
    handlers: {
        list: (...args) =>
            computedShowAllPages.value
                ? allPagePaginatedListCrudAdaptor(...args)
                : singlePagePaginatedListCrudAdaptor(...args),
    },
});

// "All" is a rows-per-page selection that drives the all-pages fetch path rather than a `ps` value.
const showingAllPages = ref(seededPerPage === ALL_PAGES);
const computedShowAllPages = computed(() => showingAllPages.value);
watch(computedShowAllPages, (newVal, oldVal) => {
    if (newVal !== oldVal) {
        currentPage.value = 1;
        instanceList.clearList();
        instanceList.list();
    }
});
// Rows-per-page selection: drive the all-pages path ("All") or send the page size.
watch(perPage, (newPerPage, oldPerPage) => {
    if (newPerPage === oldPerPage) {
        return;
    }
    if (newPerPage === ALL_PAGES) {
        delete modelListProps.params[PAGE_SIZE_PARAM];
        showingAllPages.value = true;
    } else {
        showingAllPages.value = false;
        currentPage.value = 1;
        modelListProps.params[PAGE_SIZE_PARAM] = newPerPage;
    }
});
watch([validAndActive, currentPage], () => {
    instanceList.clearList({ keepPagination: true });
});
const titleStr = computed(() => {
    return `History of ${modelConfig.info?.verbose_name}`;
});
const loading = computed(() => loadingCombine(instanceList.state.loading, modelConfig.loading));

// Contribute the page title and loading state to the layout's PageTitle display.
usePageTitle(() => ({ title: titleStr.value, loading: instanceList.state.loading }));

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
const theme = useTheme("ViewHistoryList", props);
const icons = useIcons("ViewHistoryList", props);
const formatHistoryDate = (date) => {
    return date ? DateTime.fromISO(date).toLocaleString(DateTime.DATETIME_MED) : "";
};
// Static relative phrase resolved once at render (history rows are after-the-fact and rarely
// re-render; avoid a global ticker until a UX need is demonstrated).
const formatRelativeHistoryDate = (date) => {
    return date ? DateTime.fromISO(date).toRelative() : "";
};
// Map django-simple-history's raw single-character codes (and the normalized strings
// downstream consumers may produce) onto a pill kind + icon name + readable label. Unknown
// values fall through to the raw value so the cell still renders something audit-safe.
const HISTORY_TYPE_MAP = {
    "+": { kind: "created", icon: "typeCreated", label: "created" },
    created: { kind: "created", icon: "typeCreated", label: "created" },
    "~": { kind: "updated", icon: "typeUpdated", label: "updated" },
    updated: { kind: "updated", icon: "typeUpdated", label: "updated" },
    changed: { kind: "updated", icon: "typeUpdated", label: "updated" },
    "-": { kind: "deleted", icon: "typeDeleted", label: "deleted" },
    deleted: { kind: "deleted", icon: "typeDeleted", label: "deleted" },
    restored: { kind: "restored", icon: "typeRestored", label: "restored" },
};
const historyTypeMeta = (value) => HISTORY_TYPE_MAP[value] ?? null;
// Show the dedicated empty state only after loading settles with zero rows. While loading,
// keep the grid visible so its skeleton rows render.
const hasHistory = computed(() => !!instanceList.state.loading || (instanceList.state.objectsInOrder?.length ?? 0) > 0);
const rowAttrs = (obj) => {
    if (obj?.parent_row === undefined || obj?.parent_row === null) {
        return null;
    }
    // The first row of a revision carries the meta columns; subsequent rows in the same
    // revision share the same `parent_row` index but have only `field`, `old`, `new` set.
    // The grouping ordering in `computedChangeObjects` guarantees siblings are contiguous.
    const isStart = obj.history_id !== undefined && obj.history_id !== null;
    return {
        "data-rev-start": isStart ? "true" : undefined,
        "data-rev-child": !isStart ? "true" : undefined,
        class: theme("row"),
    };
};
const slots = useSlots();
</script>
<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value">
        <!-- The Back button teleports into the layout's PageTitle action zone. -->
        <page-actions>
            <Button emphasis="ghost" @click="router.back()">Back</Button>
        </page-actions>
        <slot name="before-list" />
        <div v-if="!hasHistory" :class="theme('empty')" data-qa="view-history-empty">
            <!-- @slot empty Replaces the dedicated history empty-state body. Receives no slot props. -->
            <slot name="empty">
                <div :class="theme('emptyIcon')" aria-hidden="true">
                    <component :is="icons('clock').component" v-if="icons('clock')" v-bind="icons('clock').props" />
                </div>
                <strong :class="theme('emptyTitle')">No history yet</strong>
                <p :class="theme('emptyDesc')">
                    This record has no recorded changes. Once edits are made, they appear here grouped by revision with
                    a per-field old to new diff.
                </p>
            </slot>
        </div>
        <div v-else class="flex flex-col">
            <!-- @slot meta-strip Replaces the meta filter + layout-toggle strip above the grid. Receives `{ isTable, layoutOverride, setLayoutOverride }` so consumer overrides can drive the layout state. -->
            <slot v-if="!hideMetaStrip" name="meta-strip" v-bind="{ isTable, layoutOverride, setLayoutOverride }">
                <div :class="theme('meta')" data-qa="view-history-meta">
                    <!-- @slot meta-filters Renders the filter chip row inside the meta strip. Empty by default; bind from consumer state. Receives no slot props. -->
                    <slot name="meta-filters" />
                    <span :class="theme('metaSpacer')" />
                    <div :class="theme('layoutToggle')" role="group" aria-label="Layout">
                        <button
                            type="button"
                            :class="theme('layoutButton')"
                            :data-active="
                                (layoutOverride === 'auto' ? isTable : layoutOverride === 'table') ? 'true' : undefined
                            "
                            :aria-pressed="
                                (layoutOverride === 'auto' ? isTable : layoutOverride === 'table') ? 'true' : 'false'
                            "
                            data-qa="view-history-layout-table"
                            @click="setLayoutOverride('table')"
                        >
                            <component
                                :is="icons('table').component"
                                v-if="icons('table')"
                                v-bind="icons('table').props"
                            />
                            Table
                        </button>
                        <button
                            type="button"
                            :class="theme('layoutButton')"
                            :data-active="
                                (layoutOverride === 'auto' ? !isTable : layoutOverride === 'cards') ? 'true' : undefined
                            "
                            :aria-pressed="
                                (layoutOverride === 'auto' ? !isTable : layoutOverride === 'cards') ? 'true' : 'false'
                            "
                            data-qa="view-history-layout-cards"
                            @click="setLayoutOverride('cards')"
                        >
                            <component
                                :is="icons('idCard').component"
                                v-if="icons('idCard')"
                                v-bind="icons('idCard').props"
                            />
                            Cards
                        </button>
                    </div>
                </div>
            </slot>
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
                :row-attrs="rowAttrs"
                :table-breakpoint="effectiveTableBreakpoint"
                @update:is-table="handleIsTableUpdate"
            >
                <template v-for="field in calculatedHistoryFields" :key="field" #[`field(${field})`]="{ obj }">
                    <slot :name="`field(${field})`" v-bind="{ obj }">
                        <template v-if="field === 'history_date'">
                            <span v-if="obj[field]" :class="theme('cellDate')">
                                {{ formatHistoryDate(obj[field]) }}
                            </span>
                            <span v-if="obj[field]" :class="theme('cellDateRel')">
                                {{ formatRelativeHistoryDate(obj[field]) }}
                            </span>
                        </template>
                        <template v-else-if="field === 'history_user'">
                            <span v-if="obj[field]" :class="theme('cellUser')">
                                <UserAvatar :name="obj[field]" :size="22" />
                                <span :class="theme('cellUserName')">{{ obj[field] }}</span>
                            </span>
                        </template>
                        <template v-else-if="field === 'history_type'">
                            <span
                                v-if="historyTypeMeta(obj[field])"
                                :class="theme('typePill')"
                                :data-kind="historyTypeMeta(obj[field]).kind"
                            >
                                <component
                                    :is="icons(historyTypeMeta(obj[field]).icon).component"
                                    v-if="icons(historyTypeMeta(obj[field]).icon)"
                                    v-bind="icons(historyTypeMeta(obj[field]).icon).props"
                                />
                                {{ historyTypeMeta(obj[field]).label }}
                            </span>
                            <template v-else>
                                {{ obj[field] }}
                            </template>
                        </template>
                        <template v-else>
                            {{ obj[field] }}
                        </template>
                    </slot>
                </template>
                <template #field(new)="{ obj }">
                    <slot name="field(new)" v-bind="{ obj }">
                        <template v-if="!isTable">
                            <span
                                v-for="changed in obj.changes"
                                :key="changed.field"
                                :class="theme('diff')"
                                data-side="new"
                                :data-empty="
                                    changed.new === null || changed.new === undefined || changed.new === ''
                                        ? 'true'
                                        : undefined
                                "
                            >
                                {{
                                    changed.new === null || changed.new === undefined || changed.new === ""
                                        ? "empty"
                                        : changed.new
                                }}
                            </span>
                        </template>
                        <template v-else>
                            <span
                                :class="theme('diff')"
                                data-side="new"
                                :data-empty="
                                    obj.new === null || obj.new === undefined || obj.new === '' ? 'true' : undefined
                                "
                            >
                                {{ obj.new === null || obj.new === undefined || obj.new === "" ? "empty" : obj.new }}
                            </span>
                        </template>
                    </slot>
                </template>
                <template #field(old)="{ obj }">
                    <slot name="field(old)" v-bind="{ obj }">
                        <template v-if="!isTable">
                            <span
                                v-for="changed in obj.changes"
                                :key="changed.field"
                                :class="theme('diff')"
                                data-side="old"
                                :data-empty="
                                    changed.old === null || changed.old === undefined || changed.old === ''
                                        ? 'true'
                                        : undefined
                                "
                            >
                                {{
                                    changed.old === null || changed.old === undefined || changed.old === ""
                                        ? "empty"
                                        : changed.old
                                }}
                            </span>
                        </template>
                        <template v-else>
                            <span
                                :class="theme('diff')"
                                data-side="old"
                                :data-empty="
                                    obj.old === null || obj.old === undefined || obj.old === '' ? 'true' : undefined
                                "
                            >
                                {{ obj.old === null || obj.old === undefined || obj.old === "" ? "empty" : obj.old }}
                            </span>
                        </template>
                    </slot>
                </template>
            </objects-grid>
        </div>

        <pagination-footer
            v-model:current-page="currentPage"
            v-model:per-page="perPage"
            :loading="instanceList.state.loading"
            :rows="instanceList.state.paginateInfo?.perPage || 1"
            :total-records="instanceList.state.paginateInfo?.totalRecords || 1"
            :is-table="isTable"
            :page-size-options="pageSizeOptions"
            :show-total-record-num="showTotalRecordNum"
        >
            <template v-for="(_, slot) in slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </pagination-footer>
    </div>
</template>
