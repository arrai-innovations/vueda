<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { Check, Minus } from "lucide-vue-next";
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from "reka-ui";

/**
 * A checkbox built on Reka UI's CheckboxRoot, displaying a check icon when checked
 * and a minus icon when indeterminate.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the checkbox root. */
    class: { type: [String, Array, Object], default: undefined },
    /** The default checked state when uncontrolled. */
    defaultValue: { type: [Boolean, String], default: undefined },
    /** The controlled checked state (used with v-model). */
    modelValue: { type: [Boolean, String], default: undefined },
    /** Whether the checkbox is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The value submitted with a form when checked. */
    value: { type: String, default: undefined },
    /** The id applied to the underlying input element. */
    id: { type: String, default: undefined },
    /** The value representing the checked state. */
    trueValue: { type: [Boolean, String], default: undefined },
    /** The value representing the unchecked state. */
    falseValue: { type: [Boolean, String], default: undefined },
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
    <CheckboxRoot
        v-slot="slotProps"
        data-slot="checkbox"
        v-bind="forwarded"
        :class="
            cn(
                'peer border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
                props.class,
            )
        "
    >
        <CheckboxIndicator
            data-slot="checkbox-indicator"
            class="grid place-content-center text-current transition-none"
        >
            <slot v-bind="slotProps">
                <Minus v-if="slotProps.state === 'indeterminate'" class="size-3.5" />
                <Check v-else class="size-3.5" />
            </slot>
        </CheckboxIndicator>
    </CheckboxRoot>
</template>
