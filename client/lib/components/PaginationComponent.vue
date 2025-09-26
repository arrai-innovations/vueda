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
</script>

<template>
    <div :class="theme('root')">
        <slot
            name="total-records"
            :totalRecords="totalRecords"
            :loading="loading"
            :showTotalRecordNum="showTotalRecordNum"
        >
            <span :class="theme('totalRecords')" v-if="showTotalRecordNum">
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
            :allowShowAllPages="allowShowAllPages"
            @click="$emit('show-all-pages')"
            :showingAllPages="showingAllPages"
        >
            <Button
                v-if="allowShowAllPages && !showingAllPages && totalRecords > rows"
                type="button"
                variant="text"
                @click="$emit('update:showingAllPages', true)"
            >
                Show All Pages
            </Button>
        </slot>
    </div>
</template>

<style scoped></style>
