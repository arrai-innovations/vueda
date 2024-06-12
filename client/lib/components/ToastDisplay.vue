<script setup>
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import DateTimeDisplay from "@vueda/components/DateTimeDisplay.vue";
import { storeToast } from "@vueda/stores/index.js";
import { useCombinedClasses } from "@vueda/use/index.js";
import isEqual from "lodash-es/isEqual.js";
import { reactive, useAttrs, watch } from "vue";

const props = defineProps({
    id: {
        type: String,
        required: true,
    },
    timestamp: {
        type: String,
        default: "",
    },
    autoDismiss: {
        type: Boolean,
        default: true,
    },
    autoDismissProgress: {
        type: Number,
        default: 0,
    },
    variant: {
        type: String,
        default: "default",
    },
    title: {
        type: String,
        default: "",
    },
    message: {
        type: String,
        default: "",
    },
});

const toastStore = storeToast();
const combinedToastClasses = useCombinedClasses("@vueda/components/ToastDisplay.vue", props);
const attrs = useAttrs();
const propsAndAttrs = reactive({});
const dismissToast = () => toastStore.removeToast(props.id);
watch(
    [() => props, () => attrs],
    () => {
        const newPropsAndAttrs = {
            ...props,
            ...attrs,
            dismissToast,
        };
        if (!isEqual(propsAndAttrs, newPropsAndAttrs)) {
            assignReactiveObject(propsAndAttrs, newPropsAndAttrs);
        }
    },
    { immediate: true },
);
</script>

<template>
    <div :class="combinedToastClasses.headerClass">
        <slot name="header" v-bind="propsAndAttrs">
            <div :class="combinedToastClasses.timestampClass">
                <date-time-display format="relative" :value="timestamp" />
            </div>
            <div v-if="title" :class="combinedToastClasses.titleClass">{{ title }}</div>
            <div :class="combinedToastClasses.controlsClass">
                <div v-if="autoDismiss" :class="combinedToastClasses.autoDismissClass">
                    <div
                        :class="combinedToastClasses.autoDismissProgressClass"
                        :style="{ '--progress-percent': `${autoDismissProgress}%` }"
                    ></div>
                </div>
                <button :class="combinedToastClasses.dismissButtonClass" @click="dismissToast">
                    <span :class="combinedToastClasses.dismissIconClass"></span>
                </button>
            </div>
        </slot>
    </div>
    <div :class="combinedToastClasses.bodyClass">
        <slot name="body" v-bind="propsAndAttrs">
            <div :class="combinedToastClasses.messageClass">{{ message }}</div>
        </slot>
    </div>
</template>

<style scoped></style>
