<script setup>
import "@vueda/theme/vueda-tailwind/shell/CollapsibleTrigger.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { CollapsibleTrigger, injectCollapsibleRootContext } from "reka-ui";
import { useId } from "vue";

/**
 * The trigger button that toggles a Collapsible open or closed.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("CollapsibleTrigger", props);
// Reka 2.9.7 assigns the ID in Content, after an earlier Trigger has rendered.
// Initialize it here so aria-controls is valid on the first render too.
const rootContext = injectCollapsibleRootContext();
const contentId = useId();
rootContext.contentId ||= `vueda-collapsible-content-${contentId}`;
</script>

<template>
    <CollapsibleTrigger
        data-slot="collapsible-trigger"
        v-bind="delegatedProps"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </CollapsibleTrigger>
</template>
