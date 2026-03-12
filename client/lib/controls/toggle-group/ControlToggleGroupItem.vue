<script setup>
import { toggleVariants } from "@vueda/controls/toggle";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ToggleGroupItem, useForwardProps } from "reka-ui";
import { inject } from "vue";

/**
 * An individual toggle button inside a ToggleGroup.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** @type {import('class-variance-authority').VariantProps<typeof toggleVariants>['variant']} */
    variant: { type: String, default: undefined },
    /** @type {import('class-variance-authority').VariantProps<typeof toggleVariants>['size']} */
    size: { type: String, default: undefined },
    /** The value of this item. */
    value: { type: String, default: undefined },
    /** Whether this item is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const context = inject("toggleGroup");

const delegatedProps = reactiveOmit(props, "class", "size", "variant");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
    <ToggleGroupItem
        v-slot="slotProps"
        data-slot="toggle-group-item"
        :data-variant="context?.variant || variant"
        :data-size="context?.size || size"
        :data-spacing="context?.spacing"
        v-bind="forwardedProps"
        :class="
            cn(
                toggleVariants({
                    variant: context?.variant || variant,
                    size: context?.size || size,
                }),
                'w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10',
                'data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l',
                props.class,
            )
        "
    >
        <slot v-bind="slotProps" />
    </ToggleGroupItem>
</template>
