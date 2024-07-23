<script setup>
import { getCRUDForTo, isDetailView } from "@vueda/router/getCrud.js";
import omit from "lodash-es/omit.js";
import Button from "primevue/button";
import { computed } from "vue";
import { useRouter } from "vue-router";

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
    buttonClass: {
        type: String,
        default: undefined,
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

const pkValid = computed(() => (isDetailViewComputed.value && props.pk) || !isDetailViewComputed.value);
const toRouteArgs = computed(() => {
    return pkValid.value && viewToUse.value
        ? getCRUDForTo({
              app: props.app,
              model: props.model,
              pk: props.pk,
              view: viewToUse.value,
          })
        : undefined;
});
const actionDisabled = computed(
    () => isDetailViewComputed.value && (!props.pk || (Array.isArray(props.pk) && props.pk.length === 0)),
);
const router = useRouter();
const toRoute = computed(() =>
    router.hasRoute(toRouteArgs.value?.name) ? router.resolve(toRouteArgs.value) : undefined,
);
const href = computed(() => {
    return toRoute.value.href;
});
const navigate = () => {
    router.push(toRoute.value);
};
// const toRouteProps = computed(() => {
//     const props = toRoute.value.matched?.[0]?.props?.default;
//     if (isFunction(props)) {
//         return props(toRoute.value);
//     }
//     return props;
// })
</script>

<template>
    <div :class="$attrs.class">
        <slot
            v-if="$slots.button && toRoute"
            :class="buttonClass"
            :href="button ? undefined : href"
            :label="label"
            :link="!button"
            name="button"
            :navigate="navigate"
            v-bind="omit($attrs, ['class'])"
        />
        <Button
            v-else-if="toRoute"
            v-bind="omit($attrs, ['class'])"
            :class="buttonClass"
            :disabled="actionDisabled"
            :href="button ? undefined : href"
            :label="label"
            :link="!button"
            @click="navigate"
        >
            <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </Button>
        <slot v-else name="invalid-route"> Invalid route or permission denied. </slot>
    </div>
</template>
