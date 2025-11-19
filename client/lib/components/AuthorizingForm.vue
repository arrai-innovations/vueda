<script setup>
import ActionForm from "@vueda/components/ActionForm.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import { useForm } from "@vueda/use/useForm.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useToast } from "primevue/usetoast";
import { onMounted, toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const props = defineProps({
    redirect: {
        type: [String, Object],
        default: undefined,
    },
    header: {
        type: String,
        default: "",
    },
    subTitle: {
        type: String,
        default: "",
    },
    runAction: {
        type: Function,
        default: undefined,
    },
    formProps: {
        type: Object,
        default: () => ({}),
    },
    permitted: {
        type: Boolean,
        default: true,
    },
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
const emit = defineEmits(["form-object"]);

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
            <slot name="auth-form-prefix-header" />
            <div v-if="props.permitted" :class="theme('inner')" data-qa="authorizing-form-inner">
                <slot name="auth-form-inner" :header="header" :sub-title="subTitle">
                    <div :class="theme('contentContainer')" data-qa="authorizing-form-content-container">
                        <div :class="theme('title')">
                            <slot name="header" :header="header">
                                <h1 v-if="header" data-qa="authorizing-form-header">
                                    {{ header }}
                                </h1>
                            </slot>

                            <p>{{ subTitle }}</p>
                        </div>
                        <slot name="content" :run-action="runAction" v-bind="$attrs">
                            <action-form :run-action="runAction" v-bind="$attrs">
                                <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                                    <slot :name="slot" v-bind="slotProps || {}" />
                                </template>
                            </action-form>
                        </slot>
                    </div>
                    <slot name="suffix" />
                </slot>
            </div>
            <div v-else>
                <slot name="invalid-message"></slot>
            </div>
        </div>
    </div>
</template>
