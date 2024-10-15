<script setup>
import { useLinkModelView } from "@vueda/use/useLinkModelView.js";
import Button from "primevue/button";

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
    view: {
        type: [String, Array, Object],
        default: "read",
    },
    label: {
        type: String,
        // icon only is fine, stop warnings
        default: undefined,
    },
    button: {
        type: Boolean,
        default: false,
    },
    buttonClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});

const linkModelView = useLinkModelView(props);
</script>

<template>
    <Button
        :disabled="linkModelView.actionDisabled.value"
        :href="button ? undefined : linkModelView.href.value"
        :label="label"
        :link="!button"
        :pt="buttonClass"
        @click="linkModelView.navigate"
    >
        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </Button>
</template>
