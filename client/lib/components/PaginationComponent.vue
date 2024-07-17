<script setup>
import Paginator from "primevue/paginator";
import { ref } from "vue";

const emit = defineEmits(["update:currentPage"]);

defineProps({
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
});
const offset = ref(0);
const onPaginate = async (page) => {
    emit("update:currentPage", page.first / page.rows + 1);
};
</script>

<template>
    <div class="card">
        <Paginator
            v-model:first="offset"
            :rows="rows"
            template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            :total-records="totalRecords"
            @page="onPaginate"
        />
    </div>
</template>

<style scoped></style>
