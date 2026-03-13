<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { SwitchRoot, SwitchThumb, useForwardPropsEmits } from "reka-ui";

/**
 * A toggle switch built on Reka UI's SwitchRoot, with a sliding thumb indicator.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the switch root. */
    class: { type: [String, Array, Object], default: undefined },
    /** The default checked state when uncontrolled. */
    defaultValue: { type: Boolean, default: undefined },
    /** The controlled checked state (used with v-model). */
    modelValue: { type: Boolean, default: undefined },
    /** Whether the switch is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The id applied to the underlying input element. */
    id: { type: String, default: undefined },
    /** The value submitted with a form when checked. */
    value: { type: String, default: undefined },
    /** The value representing the checked state. */
    trueValue: { default: undefined },
    /** The value representing the unchecked state. */
    falseValue: { default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** The name submitted with a form. */
    name: { type: String, default: undefined },
    /** Whether the field is required. */
    required: { type: Boolean, default: undefined },
});

const emits = defineEmits(["update:modelValue"]);

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
    <SwitchRoot
        v-slot="slotProps"
        data-slot="switch"
        v-bind="forwarded"
        :class="
            cn(
                'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
                props.class,
            )
        "
    >
        <SwitchThumb
            data-slot="switch-thumb"
            :class="
                cn(
                    'bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0',
                )
            "
        >
            <slot name="thumb" v-bind="slotProps" />
        </SwitchThumb>
    </SwitchRoot>
</template>
