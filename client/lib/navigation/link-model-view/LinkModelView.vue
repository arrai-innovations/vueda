<script setup>
import Button from "@vueda/controls/button/Button.vue";
import { useLinkModelView } from "@vueda/use/useLinkModelView.js";
import { resolveActionVariant } from "@vueda/utils/actionVariant.js";
import { computed } from "vue";

/**
 * Renders a VUEDA Button control that navigates to a named model view (such as read, update, or a
 * custom action) for a given app, model, and optional pk. Renders as a link by default, or as
 * a standard button when the `button` prop is set.
 *
 * Styling resolves in two modes. In action styling mode (any of `primary`, `tone`, or
 * `emphasis` is set) the button's look comes from the two-layer action mapping (see
 * `utils/actionVariant.js`): the action's intrinsic tone (a delete/destroy action is destructive)
 * crossed with the placement emphasis (`emphasis`, or `fill` when `primary`). Otherwise it renders
 * as the plain navigation affordance: primary fill for `button`, primary link for anchor links.
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
    /** When true, disables the button and prevents navigation. */
    disabled: {
        type: Boolean,
        default: false,
    },
    /** When true, promotes this action to the filled hero CTA for its view. */
    primary: {
        type: Boolean,
        default: false,
    },
    /**
     * Explicit tone override (the color axis); wins over the action's intrinsic tone.
     * @type {'neutral' | 'primary' | 'destructive'}
     */
    tone: {
        type: String,
        default: undefined,
    },
    /**
     * Placement emphasis when not promoted; setting it switches the button into action styling mode.
     * @type {'fill' | 'outline' | 'ghost' | 'link'}
     */
    emphasis: {
        type: String,
        default: undefined,
    },
});

const linkModelView = useLinkModelView(props);

// Action styling mode is opt-in so plain navigation links keep their primary
// link styling, while action buttons route through the two-layer mapping.
const actionMode = computed(() => props.primary || props.tone != null || props.emphasis != null);
const resolvedVariant = computed(() =>
    resolveActionVariant({
        actionName: props.view,
        actionDetail: linkModelView.actionDetail.value,
        primary: props.primary,
        tone: props.tone,
        emphasis: props.emphasis,
    }),
);
</script>

<template>
    <Button
        :as="button ? 'button' : 'a'"
        :disabled="linkModelView.actionDisabled.value"
        :href="button ? undefined : linkModelView.href.value"
        :tone="actionMode ? resolvedVariant.tone : 'primary'"
        :emphasis="actionMode ? resolvedVariant.emphasis : button ? 'fill' : 'link'"
        @click="linkModelView.navigate"
    >
        {{ label }}
        <slot />
    </Button>
</template>
