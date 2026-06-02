<script setup>
import Skeleton from "@vueda/feedback/skeleton/Skeleton.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

const PATTERNS = {
    form: [60, 90, 45, 75],
    table: [100, 100, 100, 100],
    card: [40, 80, 60, 50],
};

/**
 * Multi-bar layout skeleton that claims vertical space while real content loads.
 * Stacks N `Skeleton` bars at varying widths inside a bordered card-radius
 * container with a shimmer sweep on the wrapper. Pass `bars` as a width-percent
 * array or pick a `pattern` preset (`form` | `table` | `card`).
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Width percentages for each skeleton bar. Ignored when `pattern` is set.
     *
     * @type {number[]}
     */
    bars: {
        type: Array,
        default: () => [40, 90, 70, 50],
    },
    /**
     * Named layout preset. Overrides `bars` when provided.
     *
     * @type {'form'|'table'|'card'}
     */
    pattern: {
        type: String,
        default: undefined,
        validator: (v) => ["form", "table", "card"].includes(v),
    },
    /**
     * Additional CSS classes applied to the root element.
     *
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("LoadingSkeletonGhost", props);

const resolvedBars = computed(() => (props.pattern ? PATTERNS[props.pattern] : props.bars));
</script>

<template>
    <div
        data-slot="loading-skeleton-ghost"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        data-qa="loading-skeleton-ghost-root"
    >
        <Skeleton
            v-for="(width, i) in resolvedBars"
            :key="i"
            :class="theme('bar')"
            :style="{ width: `${width}%` }"
            :data-qa="`loading-skeleton-ghost-bar-${i}`"
        />
    </div>
</template>
