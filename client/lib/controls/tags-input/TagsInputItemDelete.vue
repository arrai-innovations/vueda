<script setup>
import "@vueda/theme/vueda-tailwind/controls/TagsInputItemDelete.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { TagsInputItemDelete, useForwardProps } from "reka-ui";

/**
 * A delete button within a TagsInputItem that removes the tag when activated.
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
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride");

const forwardedProps = useForwardProps(delegatedProps);

const theme = useTheme("TagsInputItemDelete", props);
const icon = useIcons("TagsInputItemDelete", props);
</script>

<template>
    <TagsInputItemDelete
        data-slot="tags-input-item-delete"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot>
            <component
                :is="icon('close').component"
                v-if="icon('close')"
                v-bind="icon('close').props"
                aria-hidden="true"
            />
        </slot>
    </TagsInputItemDelete>
</template>
