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
    PAGE_PARAM,
    PAGE_SIZE_PARAM,
} from "@vueda/utils/constants.js";
import { allPagePaginatedListCrudAdaptor, singlePagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { DateTime } from "luxon";
import { computed, inject, nextTick, reactive, ref, toRef, useSlots, watch } from "vue";
import { useRouter } from "vue-router";

/**
 * Paginated list view showing the history of one model instance as the actions that produced it.
 * Each action groups the events it wrote, and each event lists its field changes with old and new
 * values, in a table or card layout.
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
    /**
     * Ordered list of column names to display. The history response defines the set: `recorded_at`,
     * `actor`, `kind`, `label`, `model`, `relation`, `type`, `field`, `old`, and `new`. `field` is a
     * table-only column; the card layout stacks each event's changes inside `old` and `new`.
     */
    fields: {
        type: Array,
        default: () => ["recorded_at", "actor", "kind", "label", "model", "type", "field", "old", "new"],
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
    /** When true, displays the total number of actions in the pagination bar. */
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
    if (layoutOverride.value === "table") {
        return "xs";
    }
    if (layoutOverride.value === "cards") {
        return "inf";
    }
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
const resettingTarget = ref(false);
const validAndActive = computed(
    () =>
        !!(
            isActive.value &&
            !resettingTarget.value &&
            props.app &&
            props.model &&
            props.pk &&
            modelConfig.loading === false
        ),
);
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
    pkKey: "id",
    params: {
        [PAGE_PARAM]: currentPage,
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
    if (newVal !== oldVal && validAndActive.value) {
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
watch([() => props.app, () => props.model, () => props.pk], () => {
    // Toggle list intent even when the new history target has identical request parameters.
    resettingTarget.value = true;
    currentPage.value = 1;
    perPage.value = props.pageSizeOptions.includes(props.defaultPageSize) ? props.defaultPageSize : DEFAULT_PAGE_SIZE;
    layoutOverride.value = "auto";
    instanceList.clearError();
    instanceList.clearList();
    nextTick(() => {
        resettingTarget.value = false;
    });
});
const titleStr = computed(() => {
    return `History of ${modelConfig.info?.verbose_name}`;
});
const loading = computed(() => loadingCombine(instanceList.state.loading, modelConfig.loading));

// Contribute the page title and loading state to the layout's PageTitle display.
usePageTitle(() => ({ title: titleStr.value, loading: instanceList.state.loading }));

// The columns come from the history response, not from the model's own fields. Every entry is an
// `extra` field so ObjectsGrid renders it without consulting model info.
const HISTORY_COLUMNS = [
    { name: "recorded_at", label: "When" },
    { name: "actor", label: "Who" },
    { name: "kind", label: "Kind" },
    { name: "label", label: "Action" },
    { name: "model", label: "Model" },
    { name: "relation", label: "Relation" },
    { name: "type", label: "Type" },
    { name: "field", label: "Field" },
    { name: "old", label: "Old" },
    { name: "new", label: "New" },
].map((column) => ({ ...column, extra: true }));
const computedFieldObjects = computed(() => {
    return props.fields
        .filter((name) => isTable.value || name !== "field")
        .map((name) => HISTORY_COLUMNS.find((column) => column.name === name))
        .filter(Boolean);
});

const router = useRouter();

// The server says nothing about a field when an event carries no difference: a create has no
// earlier snapshot, a delete repeats the one before it, and an update may have touched no tracked
// value. The wording for that row is the client's.
const NO_CHANGE_FIELD = {
    created: "(created)",
    deleted: "(deleted)",
};
const noChangeField = (type) => NO_CHANGE_FIELD[type] ?? "(no field changes)";

const groupMeta = (group) => ({
    group_id: group.id,
    action_id: group.action_id,
    recorded_at: group.recorded_at,
    kind: group.kind,
    label: group.label,
    actor: group.actor,
});
const eventMeta = (event) => ({
    event_id: event.id,
    model: event.model,
    object_id: event.object_id,
    relation: event.relation,
    type: event.type,
    event_recorded_at: event.recorded_at,
});
// Table rows: one per field change. The first row of an action carries the action's metadata and
// the first row of each event carries the event's, so the grid reads as nested groups without
// repeating the same cell down a column.
const computedChangeRows = computed(() => {
    return instanceList.state.objectsInOrder.flatMap((group, groupIndex) => {
        return (group.events ?? []).flatMap((event, eventIndex) => {
            const noChanges = !event.changes?.length;
            const changes = noChanges ? [{ field: noChangeField(event.type) }] : event.changes;
            return changes.map((change, changeIndex) => ({
                id: `${event.id}:${changeIndex}`,
                group_row: groupIndex,
                group_start: eventIndex === 0 && changeIndex === 0,
                event_start: changeIndex === 0,
                no_changes: noChanges,
                ...(eventIndex === 0 && changeIndex === 0 ? groupMeta(group) : {}),
                ...(changeIndex === 0 ? eventMeta(event) : {}),
                field: change.field,
                old: change.old,
                new: change.new,
            }));
        });
    });
});
// Card rows: one per event, keeping its change list so the old and new cells can stack it. An event
// with no difference to stack carries `no_changes` instead, the way a table row does; the card has
// no Field column to name it in, so both value cells say so themselves.
const computedEventRows = computed(() => {
    return instanceList.state.objectsInOrder.flatMap((group, groupIndex) => {
        return (group.events ?? []).map((event, eventIndex) => ({
            id: event.id,
            group_row: groupIndex,
            group_start: eventIndex === 0,
            event_start: true,
            no_changes: !event.changes?.length,
            ...(eventIndex === 0 ? groupMeta(group) : {}),
            ...eventMeta(event),
            changes: event.changes ?? [],
        }));
    });
});
const computedCalculatedObjects = computed(() => {
    return isTable.value ? computedChangeRows.value : computedEventRows.value;
});

const evenColumn = (obj) => {
    return obj.group_row % 2 === 0;
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
// Map the event types the server publishes onto a pill kind, icon name, and readable label. An
// unknown value falls through to the raw value so the cell still renders something audit-safe.
const HISTORY_TYPE_MAP = {
    created: { kind: "created", icon: "typeCreated", label: "created" },
    updated: { kind: "updated", icon: "typeUpdated", label: "updated" },
    deleted: { kind: "deleted", icon: "typeDeleted", label: "deleted" },
};
const historyTypeMeta = (value) => HISTORY_TYPE_MAP[value] ?? null;
// A referenced row arrives as `{ id, display, missing }`. The server publishes the absence
// structurally; the wording for a row that no longer exists is the client's.
const isReference = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value) && "missing" in value && "display" in value;
const isEmptyValue = (value) => value === null || value === undefined || value === "";
const referenceText = (reference, noun = "row") => {
    if (reference.missing) {
        return reference.id === null || reference.id === undefined
            ? `deleted ${noun}`
            : `deleted ${noun} #${reference.id}`;
    }
    return reference.display ?? String(reference.id);
};
// One side of a change, as the diff chip shows it: `text` to render, `empty` for a side that
// holds nothing, and `missing` for a reference whose row is gone.
const changeSide = (value) => {
    if (isEmptyValue(value)) {
        return { text: "empty", empty: true, missing: false };
    }
    if (isReference(value)) {
        return { text: referenceText(value), empty: false, missing: value.missing };
    }
    if (typeof value === "object") {
        return { text: JSON.stringify(value), empty: false, missing: false };
    }
    return { text: String(value), empty: false, missing: false };
};
// `app_label.Model` reads as the model alone in a column that already says which row it names.
const modelDisplay = (label) => (label ? label.split(".").pop() : "");
// Show the dedicated empty state only after loading settles with zero rows. While loading,
// keep the grid visible so its skeleton rows render.
const hasHistory = computed(() => !!instanceList.state.loading || (instanceList.state.objectsInOrder?.length ?? 0) > 0);
const rowAttrs = (obj) => {
    if (obj?.group_row === undefined || obj?.group_row === null) {
        return null;
    }
    // The first row of an action carries its metadata; the rows that follow belong to the same
    // action and share its `group_row`. The flattening keeps an action's rows contiguous.
    return {
        "data-rev-start": obj.group_start ? "true" : undefined,
        "data-rev-child": !obj.group_start ? "true" : undefined,
        "data-event-start": obj.event_start ? "true" : undefined,
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
                    This record has no recorded changes. Once edits are made, they appear here grouped by the action
                    that made them, with a per-field old to new diff.
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
                pk-key="id"
                :related-objects="instanceList.state.relatedObjects"
                :row-attrs="rowAttrs"
                :table-breakpoint="effectiveTableBreakpoint"
                @update:is-table="handleIsTableUpdate"
            >
                <template #field(recorded_at)="{ obj }">
                    <slot name="field(recorded_at)" v-bind="{ obj }">
                        <span v-if="obj.recorded_at" :class="theme('cellDate')">
                            {{ formatHistoryDate(obj.recorded_at) }}
                        </span>
                        <span v-if="obj.recorded_at" :class="theme('cellDateRel')">
                            {{ formatRelativeHistoryDate(obj.recorded_at) }}
                        </span>
                    </slot>
                </template>
                <template #field(actor)="{ obj }">
                    <slot name="field(actor)" v-bind="{ obj }">
                        <span
                            v-if="obj.actor"
                            :class="theme('cellUser')"
                            :data-missing="obj.actor.missing ? 'true' : undefined"
                        >
                            <UserAvatar v-if="!obj.actor.missing" :name="obj.actor.display" :size="22" />
                            <span :class="theme('cellUserName')" :data-missing="obj.actor.missing ? 'true' : undefined">
                                {{ referenceText(obj.actor, "user") }}
                            </span>
                        </span>
                    </slot>
                </template>
                <template #field(kind)="{ obj }">
                    <slot name="field(kind)" v-bind="{ obj }">
                        <span v-if="obj.kind" :class="theme('kindPill')" :data-kind="obj.kind">{{ obj.kind }}</span>
                    </slot>
                </template>
                <template #field(model)="{ obj }">
                    <slot name="field(model)" v-bind="{ obj }">
                        <span v-if="obj.model" :class="theme('cellModel')" :data-relation="obj.relation">
                            {{ modelDisplay(obj.model) }}
                            <span v-if="obj.relation === 'related'" :class="theme('cellModelObject')">
                                #{{ obj.object_id }}
                            </span>
                        </span>
                    </slot>
                </template>
                <template #field(type)="{ obj }">
                    <slot name="field(type)" v-bind="{ obj }">
                        <span
                            v-if="historyTypeMeta(obj.type)"
                            :class="theme('typePill')"
                            :data-kind="historyTypeMeta(obj.type).kind"
                        >
                            <component
                                :is="icons(historyTypeMeta(obj.type).icon).component"
                                v-if="icons(historyTypeMeta(obj.type).icon)"
                                v-bind="icons(historyTypeMeta(obj.type).icon).props"
                            />
                            {{ historyTypeMeta(obj.type).label }}
                        </span>
                        <template v-else-if="obj.type">
                            {{ obj.type }}
                        </template>
                    </slot>
                </template>
                <template v-for="side in ['old', 'new']" :key="side" #[`field(${side})`]="{ obj }">
                    <slot :name="`field(${side})`" v-bind="{ obj }">
                        <template v-if="!isTable">
                            <span v-if="obj.no_changes" :class="theme('diff')" :data-side="side" data-empty="true">
                                {{ noChangeField(obj.type) }}
                            </span>
                            <template v-else>
                                <span
                                    v-for="changed in obj.changes"
                                    :key="changed.field"
                                    :class="theme('diff')"
                                    :data-side="side"
                                    :data-empty="changeSide(changed[side]).empty ? 'true' : undefined"
                                    :data-missing="changeSide(changed[side]).missing ? 'true' : undefined"
                                >
                                    <span :class="theme('diffField')">{{ changed.field }}</span>
                                    {{ changeSide(changed[side]).text }}
                                </span>
                            </template>
                        </template>
                        <span
                            v-else-if="!obj.no_changes"
                            :class="theme('diff')"
                            :data-side="side"
                            :data-empty="changeSide(obj[side]).empty ? 'true' : undefined"
                            :data-missing="changeSide(obj[side]).missing ? 'true' : undefined"
                        >
                            {{ changeSide(obj[side]).text }}
                        </span>
                    </slot>
                </template>
            </objects-grid>
        </div>

        <pagination-footer
            v-model:current-page="currentPage"
            v-model:per-page="perPage"
            :loading="instanceList.state.loading"
            :rows="instanceList.state.paginateInfo?.perPage ?? 1"
            :total-records="instanceList.state.paginateInfo?.totalRecords ?? 1"
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
