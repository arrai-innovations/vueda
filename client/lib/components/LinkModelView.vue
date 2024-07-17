<script setup>
import { getCRUDForTo, isDetailView } from "@vueda/router/getCrud.js";
import Button from "primevue/button";
import { computed } from "vue";

// import { useRouter } from "vue-router";
// import isFunction from "lodash-es/isFunction.js";

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
    button: {
        type: Boolean,
        default: false,
    },
    view: {
        type: [String, Array, Object],
        default: "read",
    },
    label: {
        type: String,
        required: true,
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
// todo: this won't be the way to determine if we are a detail view once there are arbitrary views names
//  we will need to store the view type in the route props and retrieve it here
//
const toRouteArgs = computed(() => {
    return viewToUse.value
        ? getCRUDForTo({
              app: props.app,
              model: props.model,
              pk: props.pk,
              view: viewToUse.value,
          })
        : undefined;
});
// const router = useRouter();
// const toRoute = computed(() => {
//     return router.resolve(toRouteArgs.value);
// });
// const toRouteProps = computed(() => {
//     const props = toRoute.value.matched?.[0]?.props?.default;
//     if (isFunction(props)) {
//         return props(toRoute.value);
//     }
//     return props;
// })
</script>

<template>
    <router-link
        v-if="(isDetailViewComputed && pk) || !isDetailViewComputed"
        v-slot="slotProps"
        custom
        :to="toRouteArgs"
    >
        <Button
            v-bind="$attrs"
            :href="button ? undefined : slotProps.href"
            :label="label"
            :link="!button"
            @click="slotProps.navigate"
        />
    </router-link>
    <slot v-else></slot>
</template>
