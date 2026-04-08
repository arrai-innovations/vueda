<script setup>
import { ControlButton } from "@vueda/controls/button";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import Paginator from "primevue/paginator";
import { computed, ref } from "vue";

/**
 * Pagination bar that combines a PrimeVue Paginator with a total-record count display and a "Show All Pages" button.
 */
defineOptions({});

const emit = defineEmits([
    /** Emitted when the user navigates to a different page; payload is the 1-based page number. */
    "update:currentPage",
    /** Emitted when the user clicks "Show All Pages"; payload is `true`. */
    "update:showingAllPages",
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
    /** Number of records displayed per page. */
    rows: {
        type: Number,
        required: true,
    },
    /** When `true`, the paginator shows placeholder page counts while data is loading. */
    loading: {
        type: Boolean,
        default: undefined,
    },
    /** When `true`, the "Show All Pages" button is rendered when there are more records than one page. */
    allowShowAllPages: {
        type: Boolean,
        default: true,
    },
    /** When `true`, the paginator is hidden because all records are shown on a single page. */
    showingAllPages: {
        type: Boolean,
        default: false,
    },
    /** When `true`, the total record count is displayed alongside the paginator. */
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
const offset = ref(0);
const onPaginate = async (page) => {
    emit("update:currentPage", page.first / page.rows + 1);
};
const theme = useTheme("PaginationComponent", props);
const currentPageReportTemplate = computed(() => {
    if (props.loading) {
        return "{currentPage} of ?";
    }
    return "{currentPage} of {totalPages}";
});
const handleShowAllPagesClick = () => {
    emit("update:showingAllPages", true);
};
</script>

<template>
    <div :class="theme('root')">
        <!-- Total record count area; receives `totalRecords`, `loading`, and `showTotalRecordNum` as slot props. -->
        <slot
            name="total-records"
            :total-records="totalRecords"
            :loading="loading"
            :show-total-record-num="showTotalRecordNum"
        >
            <span v-if="showTotalRecordNum" :class="theme('totalRecords')">
                {{ loading ? "" : `${totalRecords} total results` }}
            </span>
        </slot>
        <Paginator
            v-if="!showingAllPages"
            v-model:first="offset"
            :class="theme('paginator')"
            :current-page-report-template="currentPageReportTemplate"
            :rows="loading ? 1 : rows"
            template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            :total-records="loading ? offset + 1 : totalRecords"
            @page="onPaginate"
        >
        </Paginator>
        <!-- "Show All Pages" button area; receives `allowShowAllPages`, `showingAllPages`, and a click handler as slot props. -->
        <slot
            name="show-all-pages"
            :allow-show-all-pages="allowShowAllPages"
            :showing-all-pages="showingAllPages"
            @click="handleShowAllPagesClick"
        >
            <ControlButton
                v-if="allowShowAllPages && !showingAllPages && totalRecords > rows"
                type="button"
                variant="ghost"
                @click="handleShowAllPagesClick"
            >
                Show All Pages
            </ControlButton>
        </slot>
    </div>
</template>

<style scoped></style>
