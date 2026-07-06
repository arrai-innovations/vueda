<script setup>
import Kbd from "@vueda/display/kbd/Kbd.vue";
import KbdGroup from "@vueda/display/kbd/KbdGroup.vue";
import { normalizeShortcutKeys, shortcutKeysFromVNodes } from "@vueda/display/kbd/shortcutKeys.js";
import "@vueda/theme/vueda-tailwind/navigation/ContextMenuShortcut.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useSlots } from "vue";

/**
 * Displays a keyboard shortcut hint within a context menu item.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Structured shortcut key labels. Prefer this over slot text so each physical key renders as a Kbd chip. */
    keys: { type: [String, Array], default: undefined },
});

const theme = useTheme("ContextMenuShortcut", props);
const slots = useSlots();
const getKeys = () =>
    props.keys === undefined || props.keys === null
        ? shortcutKeysFromVNodes(slots.default?.() ?? [])
        : normalizeShortcutKeys(props.keys);
</script>

<template>
    <span data-slot="context-menu-shortcut" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <KbdGroup v-if="getKeys().length" :class="theme('group')">
            <Kbd v-for="(key, index) in getKeys()" :key="`${key}-${index}`" :class="theme('kbd')">
                {{ key }}
            </Kbd>
        </KbdGroup>
        <slot v-else />
    </span>
</template>
