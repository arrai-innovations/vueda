<script setup>
import "@vueda/theme/vueda-tailwind/shell/ResizableHandle.theme.js";
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { SplitterResizeHandle } from "reka-ui";

/**
 * A drag handle for resizing panels in a ResizablePanelGroup.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether to show the grip handle indicator. */
    withHandle: { type: Boolean, default: undefined },
    /** The id of the handle. */
    id: { type: String, default: undefined },
    /** The disabled state. */
    disabled: { type: Boolean, default: undefined },
});
const emits = defineEmits({
    /** Emitted when the handle drag state changes. */
    dragging: null,
});

const delegatedProps = reactiveOmit(props, "class", "withHandle", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ResizableHandle", props);
const icon = useIcons("ResizableHandle");
</script>

<template>
    <SplitterResizeHandle
        data-slot="resizable-handle"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <template v-if="props.withHandle">
            <div :class="theme('handle')">
                <slot>
                    <component
                        :is="icon('gripVertical').component"
                        v-if="icon('gripVertical')"
                        v-bind="icon('gripVertical').props"
                        aria-hidden="true"
                        class="select-none text-[10px] leading-none"
                    />
                    <span v-else aria-hidden="true" class="select-none text-[10px] leading-none">⠿</span>
                </slot>
            </div>
        </template>
    </SplitterResizeHandle>
</template>
