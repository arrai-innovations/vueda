<script setup>
import { ControlButton } from "@vueda/controls/button";
import { useLinkModelView } from "@vueda/use/useLinkModelView.js";

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
    <ControlButton
        :as="button ? 'button' : 'a'"
        :disabled="linkModelView.actionDisabled.value"
        :href="button ? undefined : linkModelView.href.value"
        :variant="button ? 'default' : 'link'"
        :class="buttonClass"
        @click="linkModelView.navigate"
    >
        {{ label }}
        <slot />
    </ControlButton>
</template>
