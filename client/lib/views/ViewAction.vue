<script setup>
import ActionForm from "@vueda/components/ActionForm.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { memoizedStartCase } from "@vueda/utils/crudSupport.js";
import Button from "primevue/button";
import { computed } from "vue";
import { useRouter } from "vue-router";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    pk: {
        type: [String, Number],
        default: undefined,
    },
    action: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        default: undefined,
    },
    class: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const actionTitleText = computed(() => {
    return props.title?.length > 0
        ? props.title
        : `${memoizedStartCase(props.action)} ${memoizedStartCase(props.model)}`;
});
const router = useRouter();
</script>

<template>
    <div :class="props.class">
        <PageTitle :title="actionTitleText">
            <template #button>
                <slot label="Return to List" name="return-button" verb="list" @click="router.back()">
                    <Button label="Return to List" verb="list" @click="router.back()" />
                </slot>
            </template>
        </PageTitle>
        <action-form :action="action" :app="app" :model="model" v-bind="$attrs">
            <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </action-form>
    </div>
</template>
