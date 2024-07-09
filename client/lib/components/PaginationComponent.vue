<script setup>
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
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
});
const offset = ref(0);
const onPaginate = async (page) => {
    emit("update:currentPage", page.first / page.rows + 1);
};
const combinedClasses = useCombinedClasses("PaginationComponent", props);
</script>

<template>
    <div class="card" :class="combinedClasses.outerClass">
        <Paginator
            v-model:first="offset"
            :rows="rows"
            template="FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            :total-records="totalRecords"
            @page="onPaginate"
        />
        {{ currentPage }}
    </div>
</template>

<style scoped></style>
