<script setup>
import ActionForm from "@vueda/components/ActionForm.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import { useForm } from "@vueda/use/useForm.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useToast } from "primevue/usetoast";
import { onMounted, toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * Authentication wrapper that monitors login state and redirects the user after a successful sign-in, rendering a header, subtitle, and delegating to ActionForm for the actual credential form.
 *
 * @vueda-slot-forward ActionForm
 */
defineOptions({});

const props = defineProps({
    /** Vue Router location to push to after a successful login; falls back to `{ name: "welcome" }` or the `?redirect` query param. */
    redirect: {
        type: [String, Object],
        default: undefined,
    },
    /** Heading text rendered above the form. */
    header: {
        type: String,
        default: "",
    },
    /** Subtitle text rendered below the heading. */
    subTitle: {
        type: String,
        default: "",
    },
    /** Action function forwarded to the inner ActionForm. */
    runAction: {
        type: Function,
        default: undefined,
    },
    /** Props passed to `useForm` to configure the form context. */
    formProps: {
        type: Object,
        default: () => ({}),
    },
    /** When `false`, the form is hidden and the `invalid-message` slot is shown instead. */
    permitted: {
        type: Boolean,
        default: true,
    },
    /** When `true`, the post-login redirect only triggers if the user has also recently authenticated (re-auth guard). */
    requireRecentLogin: {
        type: Boolean,
        default: false,
    },
    ...THEME_OVERRIDE_PROPS,
});
const router = useRouter();
const toast = useToast();
const route = useRoute();
const userStore = storeUser();
const isActive = useIsActive();
watch(
    [isActive, toRef(userStore, "loggedIn"), toRef(userStore, "recentlyLoggedIn"), toRef(userStore, "pendingFlow")],
    ([newActive, newLoggedIn, recentlyLoggedIn, newPendingFlow]) => {
        if (newPendingFlow) {
            if (newPendingFlow.id === "mfa_authenticate") {
                router.push({ name: "2fa" });
            }
        }
        if (newActive && newLoggedIn && (!props.requireRecentLogin || recentlyLoggedIn)) {
            if (route.query?.redirect) {
                router.push(route.query?.redirect);
                return;
            }
            router.push(props.redirect || { name: "welcome" });
            toast.add({
                severity: "success",
                summary: `Signed In`,
                detail: "You are now signed in and have been redirected.",
                life: 10000,
            });
        }
    },
);
const theme = useTheme("AuthorizingForm", props);
const emit = defineEmits([
    /** Emitted on mount with a ref to the reactive form values object. */
    "form-object",
]);

onMounted(() => {
    emit(
        "form-object",
        toRef(() => formContext.state.values),
    );
});
const formContext = useForm(props.formProps);
</script>

<template>
    <div :class="theme('root')" data-qa="authorizing-form-root">
        <div :class="theme('outer')" data-qa="authorizing-form-outer">
            <!-- Content rendered before the form card, outside the inner container. -->
            <slot name="auth-form-prefix-header" />
            <div v-if="props.permitted" :class="theme('inner')" data-qa="authorizing-form-inner">
                <!-- Replaces the entire inner form area; receives `header` and `subTitle` as slot props. -->
                <slot name="auth-form-inner" :header="header" :sub-title="subTitle">
                    <div :class="theme('contentContainer')" data-qa="authorizing-form-content-container">
                        <div :class="theme('title')">
                            <!-- Heading area; receives `header` as a slot prop. -->
                            <slot name="header" :header="header">
                                <h1 v-if="header" data-qa="authorizing-form-header">
                                    {{ header }}
                                </h1>
                            </slot>

                            <p>{{ subTitle }}</p>
                        </div>
                        <!-- Replaces the default ActionForm; receives `runAction` and all inherited attrs as slot props. -->
                        <slot name="content" :run-action="runAction" v-bind="$attrs">
                            <action-form :run-action="runAction" v-bind="$attrs">
                                <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                                    <slot :name="slot" v-bind="slotProps || {}" />
                                </template>
                            </action-form>
                        </slot>
                    </div>
                    <!-- Content rendered below the form content area. -->
                    <slot name="suffix" />
                </slot>
            </div>
            <div v-else>
                <!-- Content shown when `permitted` is `false`. -->
                <slot name="invalid-message"></slot>
            </div>
        </div>
    </div>
</template>
