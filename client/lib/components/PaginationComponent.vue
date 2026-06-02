<script setup>
import Button from "@vueda/controls/button/Button.vue";
import Pagination from "@vueda/navigation/pagination/Pagination.vue";
import PaginationContent from "@vueda/navigation/pagination/PaginationContent.vue";
import PaginationFirst from "@vueda/navigation/pagination/PaginationFirst.vue";
import PaginationLast from "@vueda/navigation/pagination/PaginationLast.vue";
import PaginationNext from "@vueda/navigation/pagination/PaginationNext.vue";
import PaginationPrevious from "@vueda/navigation/pagination/PaginationPrevious.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * Pagination bar that combines a Pagination with a total-record count display and a "Show All Pages" button.
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

const page = computed({
    get: () => props.currentPage,
    set: (value) => emit("update:currentPage", value),
});
const theme = useTheme("PaginationComponent", props);
const currentPageReport = computed(() => {
    if (props.loading) {
        return `${props.currentPage} of ?`;
    }
    const pageCount = Math.max(1, Math.ceil(props.totalRecords / (props.rows || 1)));
    return `${props.currentPage} of ${pageCount}`;
});
const handleShowAllPagesClick = () => {
    emit("update:showingAllPages", true);
};
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value">
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
        <Pagination
            v-if="!showingAllPages"
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
        <!-- "Show All Pages" button area; receives `allowShowAllPages`, `showingAllPages`, and a click handler as slot props. -->
        <slot
            name="show-all-pages"
            :allow-show-all-pages="allowShowAllPages"
            :showing-all-pages="showingAllPages"
            @click="handleShowAllPagesClick"
        >
            <Button
                v-if="allowShowAllPages && !showingAllPages && totalRecords > rows"
                type="button"
                variant="ghost"
                @click="handleShowAllPagesClick"
            >
                Show All Pages
            </Button>
        </slot>
    </div>
</template>
