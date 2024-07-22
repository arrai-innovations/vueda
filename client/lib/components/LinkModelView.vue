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
        type: [String, Number, Array],
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
        // icon only is fine, stop warnings
        default: undefined,
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
const actionDisabled = computed(() => {
    return isDetailViewComputed.value && (!props.pk || (Array.isArray(props.pk) && props.pk.length === 0));
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
    <div>
        <router-link v-if="(isDetailViewComputed && pk) || !isDetailViewComputed" custom :to="toRouteArgs">
            <template #default="slotProps">
                <slot
                    v-if="$slots.button"
                    :href="button ? undefined : slotProps.href"
                    :label="label"
                    :link="!button"
                    name="button"
                    :navigate="slotProps.navigate"
                    v-bind="$attrs"
                />
                <Button
                    v-else
                    v-bind="$attrs"
                    :disabled="actionDisabled"
                    :href="button ? undefined : slotProps.href"
                    :label="label"
                    :link="!button"
                    @click="slotProps.navigate"
                >
                    <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                        <slot :name="slot" v-bind="slotProps || {}" />
                    </template>
                </Button>
            </template>
        </router-link>
        <slot v-else></slot>
    </div>
</template>
