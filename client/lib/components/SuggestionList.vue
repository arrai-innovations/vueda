<script setup>
import "@vueda/theme/vueda-tailwind/display/SuggestionList.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Typed "Did you mean?" suggestion list for system 404 views. Renders an
 * uppercase head row with a mono source label above a bordered list of
 * clickable `router-link` rows. Two layout shapes are supported: `route`
 * (similarity score chip in the trailing column) and `action` (HTTP verb chip).
 * Each row is a 4-column grid: 24 px icon · 1fr label+sub · auto trailing ·
 * auto chevron. Kit canon: "At scale, 'Did you mean?' is a piece of UI, not
 * a sentence."
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /**
     * Suggestion rows. Each entry becomes one navigable row.
     *
     * @type {{ icon?: import('vue').Component, label: string, sub?: string, score?: number, verb?: string, to: import('vue-router').RouteLocationRaw }[]}
     */
    items: {
        type: Array,
        default: () => [],
    },
    /**
     * Uppercase head label displayed above the list (e.g. "Did you mean" or
     * "Available actions").
     */
    head: {
        type: String,
        default: undefined,
    },
    /**
     * Mono source label beside the head (e.g. "router.suggest()").
     */
    source: {
        type: String,
        default: undefined,
    },
    /**
     * Row layout variant. `route` shows a similarity score chip in the trailing
     * column; `action` shows an HTTP verb chip.
     *
     * @type {'route'|'action'}
     */
    shape: {
        type: String,
        default: "route",
        validator: (v) => ["route", "action"].includes(v),
    },
    /**
     * Additional CSS classes applied to the root element.
     *
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("SuggestionList", props);
const icon = useIcons("SuggestionList", props);

const formatScore = (score) => `${Math.round(score * 100)}%`;
</script>

<template>
    <div
        data-slot="suggestion-list"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        data-qa="suggestion-list-root"
    >
        <div v-if="head || source" :class="theme('headRow')" data-qa="suggestion-list-head-row">
            <span v-if="head" :class="theme('head')" data-qa="suggestion-list-head">{{ head }}</span>
            <span v-if="source" :class="theme('source')" data-qa="suggestion-list-source">{{ source }}</span>
        </div>
        <ul :class="theme('list')" data-qa="suggestion-list-list">
            <li v-for="(item, i) in items" :key="i" data-qa="suggestion-list-item">
                <router-link :class="theme('item')" :to="item.to">
                    <span :class="theme('icon')" aria-hidden="true" data-qa="suggestion-list-icon">
                        <component :is="item.icon" v-if="item.icon" />
                    </span>
                    <span :class="theme('labelStack')" data-qa="suggestion-list-label-stack">
                        <span :class="theme('label')" data-qa="suggestion-list-label">{{ item.label }}</span>
                        <span v-if="item.sub" :class="theme('sub')" data-qa="suggestion-list-sub">{{ item.sub }}</span>
                    </span>
                    <span
                        v-if="shape === 'route' && item.score !== undefined"
                        :class="theme('score')"
                        data-qa="suggestion-list-score"
                        >{{ formatScore(item.score) }}</span
                    >
                    <span
                        v-else-if="shape === 'action' && item.verb"
                        :class="theme('verb')"
                        data-qa="suggestion-list-verb"
                        >{{ item.verb }}</span
                    >
                    <span v-else />
                    <span :class="theme('chevron')" aria-hidden="true" data-qa="suggestion-list-chevron">
                        <component
                            :is="icon('chevronRight').component"
                            v-if="icon('chevronRight')"
                            v-bind="icon('chevronRight').props"
                            aria-hidden="true"
                        />
                    </span>
                </router-link>
            </li>
        </ul>
    </div>
</template>
