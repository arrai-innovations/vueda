<script setup>
import { useLinkModelView } from "@vueda/use/useLinkModelView.js";
import Button from "primevue/button";

/**
 * Renders a PrimeVue Button that navigates to a named model view (such as read, update, or a
 * custom action) for a given app, model, and optional pk. Renders as a link by default, or as
 * a standard button when the `button` prop is set.
 */
defineOptions({});

const props = defineProps({
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name used to build the target route. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key of the model instance to navigate to. */
    pk: {
        type: [String, Number, Array],
        default: undefined,
    },
    /** Named view (or view descriptor) to navigate to, such as `"read"` or `"update"`. */
    view: {
        type: [String, Array, Object],
        default: "read",
    },
    /** Button label text; omit when using an icon-only button. */
    label: {
        type: String,
        // icon only is fine, stop warnings
        default: undefined,
    },
    /** When true, renders as a standard button instead of a link-styled button. */
    button: {
        type: Boolean,
        default: false,
    },
    /** CSS class applied to the underlying PrimeVue Button via its `pt` prop. */
    buttonClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** When true, disables the button and prevents navigation. */
    disabled: {
        type: Boolean,
        default: false,
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
