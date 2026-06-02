<script setup>
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";

/**
 * A checkbox built on Reka UI's CheckboxRoot, displaying a check icon when checked
 * and a minus icon when indeterminate.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
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

const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("Checkbox", props);
const icon = useIcons("Checkbox");
</script>

<template>
    <CheckboxRoot
        v-slot="slotProps"
        data-slot="checkbox"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <CheckboxIndicator data-slot="checkbox-indicator" :class="theme('indicator')">
            <slot v-bind="slotProps">
                <component
                    :is="icon('indeterminate').component"
                    v-if="slotProps.state === 'indeterminate' && icon('indeterminate')"
                    v-bind="icon('indeterminate').props"
                    aria-hidden="true"
                />
                <component
                    :is="icon('check').component"
                    v-else-if="icon('check')"
                    v-bind="icon('check').props"
                    aria-hidden="true"
                />
            </slot>
        </CheckboxIndicator>
    </CheckboxRoot>
</template>
