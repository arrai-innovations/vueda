<script setup>
import { getCRUDForTo, isDetailView } from "@vueda/router/getCrud.js";
// import {getLowerTitle} from "@vueda/utils/crudSupport.js";
import { computed } from "vue";

defineOptions({ inheritAttrs: false });

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
    parentApp: {
        type: String,
        default: "",
    },
    parentModel: {
        type: String,
        default: "",
    },
    parentPk: {
        type: [String, Number],
        default: "",
    },
    variant: {
        type: String,
        default: "cell",
    },
    view: {
        type: [String, Array, Object],
        default: "view",
    },
});
// TODO: permissions for view
// const permissions = usePermissions();
// use the first view you have permissions for
// const permissionsPerView = computed(() => {
//     let view = props.view;
//     if (typeof view === "string") {
//         view = [view];
//     }
//     if (Array.isArray(view)) {
//         return Object.fromEntries(
//             view.map((view) => [
//                 view,
//                 permissions.hasPerm({ app: getLowerTitle(props.app), model: getLowerTitle(props.model), action: view }),
//             ])
//         );
//     }
//     return Object.fromEntries(Object.entries(view).map(([key, value]) => [key, permissions.hasPerm(value)]));
// });

const viewToUse = computed(() => {
    if (typeof props.view === "string") {
        return props.view;
    }
    // if (Array.isArray(props.view)) {
    //     return props.view.find((view) => permissionsPerView.value[view]);
    // }
    // return Object.keys(props.view).find((view) => permissionsPerView.value[view]);
    throw new Error("view should be string");
});
// const result = computed(() => permissionsPerView.value[viewToUse.value]);
const isDetailViewComputed = computed(() => isDetailView(viewToUse.value));
</script>

<template>
    <router-link
        v-if="(isDetailViewComputed && pk) || !isDetailViewComputed"
        v-slot="slotProps"
        custom
        :to="
            viewToUse
                ? getCRUDForTo({
                      app,
                      model,
                      pk,
                      view: viewToUse,
                  })
                : undefined
        "
    >
        <a :href="slotProps.href" style="color: hotpink" v-bind="$attrs" target="_blank" @click="slotProps.navigate">
            <slot :used-view="viewToUse"></slot>
        </a>
    </router-link>
    <slot v-else></slot>
</template>
