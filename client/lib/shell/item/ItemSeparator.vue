<script setup>
import Separator from "@vueda/shell/separator/Separator.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A horizontal separator rule used to divide sections within a Item or ItemGroup.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the separator. */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether the separator is purely decorative (hidden from assistive tech). */
    decorative: { type: Boolean, default: undefined },
});

const theme = useTheme("ItemSeparator", props);
</script>

<template>
    <Separator
        data-slot="item-separator"
        orientation="horizontal"
        :decorative="props.decorative"
        :class="[theme('root'), props.class]"
    />
</template>
