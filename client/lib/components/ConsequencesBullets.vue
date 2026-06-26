<script setup>
import "@vueda/theme/vueda-tailwind/display/ConsequencesBullets.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * Bulleted list of destructive-action consequences. Each item renders an
 * optional leading icon, a bold label, and an optional muted description
 * inside a 2-column grid (icon · label/sub stack). Per-item `tone`
 * (`default` | `warn` | `danger`) tints only the leading icon so the
 * consequence list communicates relative severity without overwhelming
 * the surrounding card.
 *
 * Icons resolve via `useIcons("ConsequencesBullets", props)(item.icon)`. When the
 * lookup returns null (icon name missing or unregistered), the icon cell
 * still renders so labels stay aligned across rows.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /**
     * Consequence rows.
     *
     * @type {{ icon?: string, label: string, description?: string, tone?: ('default'|'warn'|'danger') }[]}
     */
    items: {
        type: Array,
        required: true,
    },
    /**
     * Additional CSS classes applied to the root.
     *
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ConsequencesBullets", props);
const icon = useIcons("ConsequencesBullets", props);

const resolvedItems = computed(() =>
    props.items.map((item, idx) => ({
        key: idx,
        label: item.label,
        description: item.description,
        tone: item.tone || "default",
        iconEntry: item.icon ? icon(item.icon) : null,
    })),
);

const toneClass = (tone) => {
    if (tone === "warn") return theme("toneWarn");
    if (tone === "danger") return theme("toneDanger");
    return undefined;
};
</script>

<template>
    <ul data-slot="consequences-bullets" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <li
            v-for="item in resolvedItems"
            :key="item.key"
            :data-tone="item.tone"
            :class="theme('item')"
            data-qa="consequences-bullets-item"
        >
            <span :class="[theme('icon'), toneClass(item.tone)]" aria-hidden="true" data-qa="consequences-bullets-icon">
                <component :is="item.iconEntry.component" v-if="item.iconEntry" v-bind="item.iconEntry.props" />
            </span>
            <span :class="theme('text')" data-qa="consequences-bullets-text">
                <span :class="theme('label')" data-qa="consequences-bullets-label">{{ item.label }}</span>
                <span v-if="item.description" :class="theme('description')" data-qa="consequences-bullets-description">
                    {{ item.description }}
                </span>
            </span>
        </li>
    </ul>
</template>
