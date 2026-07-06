<script setup>
import Kbd from "@vueda/display/kbd/Kbd.vue";
import KbdGroup from "@vueda/display/kbd/KbdGroup.vue";
import { shortcutKeysFromVNodes } from "@vueda/display/kbd/shortcutKeys.js";
import "@vueda/theme/vueda-tailwind/navigation/MenubarShortcut.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useSlots } from "vue";

/**
 * Displays a keyboard shortcut hint within a menubar item.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("MenubarShortcut", props);
const slots = useSlots();
const getKeys = () => shortcutKeysFromVNodes(slots.default?.() ?? []);
</script>

<template>
    <span data-slot="menubar-shortcut" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <KbdGroup v-if="getKeys().length" :class="theme('group')">
            <Kbd v-for="(key, index) in getKeys()" :key="`${key}-${index}`" :class="theme('kbd')">
                {{ key }}
            </Kbd>
        </KbdGroup>
        <slot v-else />
    </span>
</template>
