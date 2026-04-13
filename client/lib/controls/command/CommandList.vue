<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ListboxContent, useForwardProps } from "reka-ui";

/**
 * Scrollable container that renders the filtered list of command items.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardProps(delegatedProps);

const theme = useTheme("CommandList", props);
</script>

<template>
    <ListboxContent data-slot="command-list" v-bind="forwarded" :class="[theme('root'), props.class]">
        <div role="presentation">
            <slot />
        </div>
    </ListboxContent>
</template>
