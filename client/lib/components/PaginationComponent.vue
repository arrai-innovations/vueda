<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import Paginator from "primevue/paginator";
import { computed, ref } from "vue";

const emit = defineEmits(["update:currentPage"]);

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
        <Paginator
            v-model:first="offset"
            :class="theme('paginator')"
            :current-page-report-template="currentPageReportTemplate"
            :rows="loading ? 1 : rows"
            template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            :total-records="loading ? offset + 1 : totalRecords"
            @page="onPaginate"
        />
    </div>
</template>

<style scoped></style>
