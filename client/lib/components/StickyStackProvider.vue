<script setup>
import "@vueda/theme/vueda-tailwind/shell/StickyStackProvider.theme.js";
import { useScrollReveal } from "@vueda/use/useScrollReveal.js";
import { useStickyStack } from "@vueda/use/useStickyStack.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, onMounted, onScopeDispose, reactive, ref, useTemplateRef, watch } from "vue";

/**
 * Hosts the framework-owned sticky chrome zones for a layout. Place it around the scrolling region
 * (inside the layout's main content area, wrapping `<RouterView>`); the window remains the scroll
 * container, so this component introduces no `overflow`. It renders a top zone pinned to the top of
 * the viewport and a bottom zone pinned to the bottom, establishes the `useStickyStack` context so
 * the active view can teleport chrome into either zone, and publishes the measured top-zone height
 * as `--vueda-sticky-stack-top` for descendants (such as a sticky grid header) to offset against.
 *
 * The page title is placed by the integrator in the `top` slot (plain composition, so the title
 * stays integrator-owned and pins with the rest of the top zone). The top zone reveals according to
 * the active view's registered chrome; the bottom zone always shows by default.
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

const stack = useStickyStack();

const root = useTemplateRef("root");
const topZone = useTemplateRef("topZone");
const bottomZone = useTemplateRef("bottomZone");

// Bind the teleport targets the active view's chrome lands in.
const topTarget = ref(null);
const bottomTarget = ref(null);
stack.bindZone("top", topTarget);
stack.bindZone("bottom", bottomTarget);

// Each zone's reveal behavior comes from the active view's registered chrome (zone default
// otherwise). The window scrolls, so no `scrollRoot` is needed.
const { hidden: topHidden } = useScrollReveal(topZone, { reveal: stack.zoneReveal("top") });
const { hidden: bottomHidden } = useScrollReveal(bottomZone, { reveal: stack.zoneReveal("bottom") });

// Publish the effective top offset for descendants: the measured top-zone height while revealed,
// collapsing to 0 while hidden so a sticky grid header rises to the viewport top with it.
const topZoneHeight = ref(0);
const measureTopZone = () => {
    topZoneHeight.value = topZone.value ? topZone.value.getBoundingClientRect().height : 0;
};
const topOffset = computed(() => (topHidden.value ? 0 : topZoneHeight.value));

/** @type {ResizeObserver | undefined} */
let resizeObserver;
onMounted(() => {
    measureTopZone();
    if (typeof ResizeObserver !== "undefined" && topZone.value) {
        resizeObserver = new ResizeObserver(measureTopZone);
        resizeObserver.observe(topZone.value);
    }
    if (import.meta.env?.DEV) {
        warnOnScrollBlockingAncestor(root.value);
    }
});
onScopeDispose(() => resizeObserver?.disconnect());
// Re-measure on reveal/hide so the published offset tracks the zone collapsing.
watch(topHidden, measureTopZone);

/**
 * Window-relative `position: sticky` silently fails inside any ancestor with a non-visible
 * `overflow`. In dev, walk the ancestor chain and warn (naming the offender) so the failure is loud
 * instead of silent. No-op in production builds.
 *
 * @param {HTMLElement|null} el
 * @returns {void}
 */
function warnOnScrollBlockingAncestor(el) {
    if (!el || typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
        return;
    }
    let node = el.parentElement;
    const documentRoot = el.ownerDocument?.documentElement;
    while (node && node !== documentRoot) {
        const style = window.getComputedStyle(node);
        for (const axis of ["overflowX", "overflowY"]) {
            const value = style[axis];
            if (value && value !== "visible") {
                console.warn(
                    `[vueda] StickyStackProvider: ancestor <${node.tagName.toLowerCase()}> sets ${axis}: ${value}, ` +
                        `which makes window-relative position:sticky pin to it instead of the viewport. ` +
                        `Remove the overflow from that ancestor, or move the scroll boundary.`,
                    node,
                );
                return;
            }
        }
        node = node.parentElement;
    }
}

const theme = useTheme(
    "StickyStackProvider",
    props,
    reactive({
        topHidden,
        bottomHidden,
    }),
);
</script>
<template>
    <div
        ref="root"
        :class="[theme('root'), props.class]"
        :style="{ '--vueda-sticky-stack-top': `${topOffset}px` }"
        data-qa="sticky-stack-root"
    >
        <div ref="topZone" :class="theme('topZone')" data-qa="sticky-stack-top-zone">
            <!-- @slot [top] Pinned top chrome placed by the integrator, typically the page title. Stacks above any chrome the active view teleports into the top zone. -->
            <slot name="top" />
            <div ref="topTarget" data-qa="sticky-stack-top-target" />
        </div>
        <!-- @slot Scrolling page content, typically the router view. -->
        <slot />
        <div ref="bottomZone" :class="theme('bottomZone')" data-qa="sticky-stack-bottom-zone">
            <div ref="bottomTarget" data-qa="sticky-stack-bottom-target" />
            <!-- @slot [bottom] Pinned bottom chrome placed by the integrator, below any chrome the active view teleports into the bottom zone. -->
            <slot name="bottom" />
        </div>
    </div>
</template>

<style scoped></style>
