<script setup>
import "@vueda/theme/vueda-tailwind/navigation/PaginationEllipsis.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { PaginationEllipsis } from "reka-ui";

/**
 * An ellipsis indicator for skipped pages in a pagination control.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
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

const theme = useTheme("PaginationEllipsis", props);
const icon = useIcons("PaginationEllipsis", props);
const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride");
</script>

<template>
    <PaginationEllipsis
        data-slot="pagination-ellipsis"
        data-qa="pagination-ellipsis"
        v-bind="delegatedProps"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot>
            <component
                :is="icon('ellipsis').component"
                v-if="icon('ellipsis')"
                v-bind="icon('ellipsis').props"
                aria-hidden="true"
            />
            <span class="sr-only">More pages</span>
        </slot>
    </PaginationEllipsis>
</template>
