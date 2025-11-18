<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import Button from "primevue/button";
import Paginator from "primevue/paginator";
import { computed, ref } from "vue";

const emit = defineEmits(["update:currentPage", "update:showingAllPages"]);

const props = defineProps({
    totalRecords: {
        type: Number,
        required: true,
    },
    currentPage: {
        type: Number,
        required: true,
    },
    rows: {
        type: Number,
        required: true,
    },
    loading: {
        type: Boolean,
        default: undefined,
    },
    allowShowAllPages: {
        type: Boolean,
        default: true,
    },
    showingAllPages: {
        type: Boolean,
        default: false,
    },
    showTotalRecordNum: {
        type: Boolean,
        default: true,
    },
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
        <slot
            name="show-all-pages"
            :allow-show-all-pages="allowShowAllPages"
            :showing-all-pages="showingAllPages"
            @click="handleShowAllPagesClick"
        >
            <Button
                v-if="allowShowAllPages && !showingAllPages && totalRecords > rows"
                type="button"
                variant="text"
                @click="handleShowAllPagesClick"
            >
                Show All Pages
            </Button>
        </slot>
    </div>
</template>

<style scoped></style>
