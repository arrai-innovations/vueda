<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ToggleGroupRoot, useForwardPropsEmits } from "reka-ui";
import { provide } from "vue";

/**
 * A group of toggle buttons that share variant and size context.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** @type {import('class-variance-authority').VariantProps<typeof import('@vueda/controls/ui/toggle').toggleVariants>['variant']} */
    variant: { type: String, default: undefined },
    /** @type {import('class-variance-authority').VariantProps<typeof import('@vueda/controls/ui/toggle').toggleVariants>['size']} */
    size: { type: String, default: undefined },
    /** The gap spacing between items (0 = flush/no-gap). */
    spacing: { type: Number, default: 0 },
    /** The selection type: 'single' or 'multiple'. */
    type: { type: String, default: undefined },
    /** The controlled value. */
    modelValue: { type: [String, Array], default: undefined },
    /** The default value. */
    defaultValue: { type: [String, Array], default: undefined },
    /** Whether the group is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** Whether to loop keyboard navigation. */
    loop: { type: Boolean, default: undefined },
    /** The orientation. */
    orientation: { type: String, default: undefined },
    /** Whether to allow deselection of a single value. */
    rovingFocus: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const emits = defineEmits(["update:modelValue"]);

provide("toggleGroup", {
    variant: props.variant,
    size: props.size,
    spacing: props.spacing,
});

const delegatedProps = reactiveOmit(props, "class", "size", "variant");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <ToggleGroupRoot
        v-slot="slotProps"
        data-slot="toggle-group"
        :data-size="size"
        :data-variant="variant"
        :data-spacing="spacing"
        :style="{
            '--gap': spacing,
        }"
        v-bind="forwarded"
        :class="
            cn(
                'group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs',
                props.class,
            )
        "
    >
        <slot v-bind="slotProps" />
    </ToggleGroupRoot>
</template>
