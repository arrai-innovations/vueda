<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import Paginator from "primevue/paginator";
import { ref } from "vue";

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
    ...THEME_OVERRIDE_PROPS,
});
const offset = ref(0);
const onPaginate = async (page) => {
    emit("update:currentPage", page.first / page.rows + 1);
};
const theme = useTheme("PaginationComponent", props);
</script>

<template>
    <div :class="theme('root')">
        <Paginator
            v-model:first="offset"
            :class="theme('paginator')"
            :rows="rows"
            template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            :total-records="totalRecords"
            @page="onPaginate"
        />
    </div>
</template>

<style scoped></style>
