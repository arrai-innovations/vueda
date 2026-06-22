<script setup>
import NativeSelect from "@vueda/controls/native-select/NativeSelect.vue";
import NativeSelectOption from "@vueda/controls/native-select/NativeSelectOption.vue";
import Pagination from "@vueda/navigation/pagination/Pagination.vue";
import PaginationBar from "@vueda/navigation/pagination/PaginationBar.vue";
import PaginationContent from "@vueda/navigation/pagination/PaginationContent.vue";
import PaginationFirst from "@vueda/navigation/pagination/PaginationFirst.vue";
import PaginationLast from "@vueda/navigation/pagination/PaginationLast.vue";
import PaginationMeta from "@vueda/navigation/pagination/PaginationMeta.vue";
import PaginationNext from "@vueda/navigation/pagination/PaginationNext.vue";
import PaginationPrevious from "@vueda/navigation/pagination/PaginationPrevious.vue";
import "@vueda/theme/vueda-tailwind/navigation/PaginationComponent.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { ALL_PAGES, DEFAULT_PAGE_SIZE_OPTIONS } from "@vueda/utils/constants.js";
import { computed } from "vue";

/**
 * Pagination footer for data views. Composes the `PaginationBar` substrate with a "Showing X to Y
 * of N" range read-out (`PaginationMeta`), a rows-per-page selector (whose final "All" entry loads
 * every page), and the first / previous / next / last navigation cluster with a "Page N of M" indicator.
 */
defineOptions({});

const emit = defineEmits([
    /** Emitted when the user navigates to a different page; payload is the 1-based page number. */
    "update:currentPage",
    /** Emitted when the user changes the rows-per-page selection; payload is a number or the `"all"` sentinel. */
    "update:perPage",
]);

const props = defineProps({
    /** Total number of records across all pages. */
    totalRecords: {
        type: Number,
        required: true,
    },
    /** The currently active 1-based page number. */
    currentPage: {
        type: Number,
        required: true,
    },
    /** Number of records the server returned per page; drives the range read-out math. */
    rows: {
        type: Number,
        required: true,
    },
    /** The selected rows-per-page value: a number, or the `"all"` sentinel for the all-pages view. */
    perPage: {
        type: [Number, String],
        default: undefined,
    },
    /** Rows-per-page options offered by the selector; the final `"all"` entry loads every page. */
    pageSizeOptions: {
        type: Array,
        default: () => [...DEFAULT_PAGE_SIZE_OPTIONS],
    },
    /** When `true`, the paginator shows placeholder page counts while data is loading. */
    loading: {
        type: Boolean,
        default: undefined,
    },
    /** When `true`, the record-count read-out is displayed. */
    showTotalRecordNum: {
        type: Boolean,
        default: true,
    },
    /** Indicates whether the paginator is used inside a table layout (reserved for theming). */
    isTable: {
        type: Boolean,
        default: true,
    },
    ...THEME_OVERRIDE_PROPS,
});

const theme = useTheme("PaginationComponent", props);

const page = computed({
    get: () => props.currentPage,
    set: (value) => emit("update:currentPage", value),
});

const showingAll = computed(() => props.perPage === ALL_PAGES);

const pageCount = computed(() => Math.max(1, Math.ceil(props.totalRecords / (props.rows || 1))));

const currentPageReport = computed(() =>
    props.loading ? `Page ${props.currentPage} of ?` : `Page ${props.currentPage} of ${pageCount.value}`,
);

// "Showing X to Y of N" (or "All N" when every page is loaded); blank while loading.
const rangeReport = computed(() => {
    if (props.loading) {
        return "";
    }
    if (showingAll.value) {
        return `All ${props.totalRecords} results`;
    }
    const start = props.totalRecords === 0 ? 0 : (props.currentPage - 1) * props.rows + 1;
    const end = Math.min(props.currentPage * props.rows, props.totalRecords);
    return `Showing ${start} to ${end} of ${props.totalRecords}`;
});

const optionLabel = (option) => (option === ALL_PAGES ? "All" : String(option));

const onPerPageChange = (value) => {
    emit("update:perPage", value === ALL_PAGES ? ALL_PAGES : Number(value));
};
</script>

<template>
    <PaginationBar :class="theme('root')" :style="theme.hideStyle?.value">
        <!-- Range read-out; receives `totalRecords`, `currentPage`, `rows`, `loading`, and the resolved `report` string. -->
        <slot
            name="meta"
            :total-records="totalRecords"
            :current-page="currentPage"
            :rows="rows"
            :loading="loading"
            :report="rangeReport"
        >
            <PaginationMeta v-if="showTotalRecordNum">{{ rangeReport }}</PaginationMeta>
        </slot>
        <div :class="theme('controls')">
            <!-- Rows-per-page selector; receives the options, the current value, and a change handler. -->
            <slot
                name="rows-per-page"
                :page-size-options="pageSizeOptions"
                :per-page="perPage"
                :on-change="onPerPageChange"
            >
                <label :class="theme('rowsPerPage')">
                    Rows per page
                    <NativeSelect
                        class="w-auto"
                        :model-value="String(perPage)"
                        aria-label="Rows per page"
                        @update:model-value="onPerPageChange"
                    >
                        <NativeSelectOption
                            v-for="option in pageSizeOptions"
                            :key="String(option)"
                            :value="String(option)"
                        >
                            {{ optionLabel(option) }}
                        </NativeSelectOption>
                    </NativeSelect>
                </label>
            </slot>
            <Pagination
                v-if="!showingAll"
                v-model:page="page"
                :class="theme('paginator')"
                :total="loading ? 0 : totalRecords"
                :items-per-page="rows"
                :disabled="loading"
            >
                <PaginationContent>
                    <PaginationFirst />
                    <PaginationPrevious />
                    <span :class="theme('pageReport')">{{ currentPageReport }}</span>
                    <PaginationNext />
                    <PaginationLast />
                </PaginationContent>
            </Pagination>
        </div>
    </PaginationBar>
</template>
