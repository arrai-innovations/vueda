<script setup>
import { useCommand } from "@vueda/use/useCommand.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { Primitive } from "reka-ui";
import { computed } from "vue";

/**
 * Shown inside CommandList when no items match the current search.
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

const { filterState } = useCommand();
const isRender = computed(() => !!filterState.search && filterState.filtered.count === 0);

const theme = useTheme("CommandEmpty", props);
</script>

<template>
    <Primitive v-if="isRender" data-slot="command-empty" v-bind="delegatedProps" :class="[theme('root'), props.class]">
        <slot />
    </Primitive>
</template>
