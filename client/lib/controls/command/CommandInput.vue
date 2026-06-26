<script setup>
import "@vueda/theme/vueda-tailwind/controls/CommandInput.theme.js";
import { useCommand } from "@vueda/use/useCommand.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ListboxFilter, useForwardProps } from "reka-ui";

/**
 * The search input for Command, bound to the shared filter state.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled filter value. Can be bound with v-model. */
    modelValue: { type: String, default: undefined },
    /** When true, focuses the input on mount. */
    autoFocus: { type: Boolean, default: undefined },
    /** When true, prevents user interaction. */
    disabled: { type: Boolean, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride");

const forwardedProps = useForwardProps(delegatedProps);

const { filterState } = useCommand();

const theme = useTheme("CommandInput", props);
const icon = useIcons("CommandInput", props);
</script>

<template>
    <div data-slot="command-input-wrapper" :class="theme('wrapper')">
        <component
            :is="icon('search').component"
            v-if="icon('search')"
            v-bind="icon('search').props"
            aria-hidden="true"
            class="size-4 shrink-0 opacity-50"
        />
        <span v-else aria-hidden="true" class="size-4 shrink-0 text-center leading-4 opacity-50 select-none">⌕</span>
        <ListboxFilter
            v-bind="{ ...forwardedProps, ...$attrs }"
            v-model="filterState.search"
            data-slot="command-input"
            auto-focus
            :class="[theme('root'), props.class]"
            :style="theme.hideStyle?.value"
        />
    </div>
</template>
