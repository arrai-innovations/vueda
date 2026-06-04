<script setup>
import "@vueda/theme/vueda-tailwind/shell/StickyBar.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, onBeforeUnmount, onMounted, reactive, ref, useSlots, useTemplateRef, watch } from "vue";

/**
 * Renders a sticky toolbar that hides when the user scrolls down past its
 * initial position and reappears when they scroll back up. Exposes named
 * `primary` (submit / primary actions, pushed to the start) and `secondary`
 * (read-only actions, contextual info) slots; falls back to the default slot
 * when neither named slot is bound.
 */
defineOptions({});

const root = useTemplateRef("root");
const slots = useSlots();
const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
});

const hasPrimarySlot = computed(() => Boolean(slots.primary));
const hasSecondarySlot = computed(() => Boolean(slots.secondary));
const useNamedSlots = computed(() => hasPrimarySlot.value || hasSecondarySlot.value);

const isScrollingUp = ref(false);
const rootThreshold = ref(0);
const lastScrollY = ref(0);
const scrollTimeout = ref(null);
const delay = 300;

const isScrolledPastThreshold = computed(() => lastScrollY.value > rootThreshold.value);

const handleScroll = () => {
    const currentScrollY = window.scrollY;
    isScrollingUp.value = currentScrollY < lastScrollY.value;
    lastScrollY.value = currentScrollY;

    if (scrollTimeout.value) {
        clearTimeout(scrollTimeout.value);
    }

    scrollTimeout.value = setTimeout(() => {
        isScrollingUp.value = true;
    }, delay);
};

watch(
    root,
    (el) => {
        if (el) {
            rootThreshold.value = el.getBoundingClientRect().bottom + window.scrollY;
        } else {
            rootThreshold.value = 0;
        }
    },
    { immediate: true },
);

onMounted(() => {
    window.addEventListener("scroll", handleScroll);
});

onBeforeUnmount(() => {
    window.removeEventListener("scroll", handleScroll);
    if (scrollTimeout.value) {
        clearTimeout(scrollTimeout.value);
    }
});

const theme = useTheme(
    "StickyBar",
    props,
    reactive({
        hidden: computed(() => isScrolledPastThreshold.value && !isScrollingUp.value),
    }),
);
</script>
<template>
    <div ref="root" :class="theme('root')" :style="theme.hideStyle?.value" data-qa="sticky-bar-root">
        <div :class="theme('inner')" data-qa="sticky-bar-inner">
            <template v-if="useNamedSlots">
                <div v-if="hasPrimarySlot" :class="theme('primary')" data-qa="sticky-bar-primary">
                    <!-- @slot [primary] Primary action area (e.g. submit button), pushed to the start of the bar. -->
                    <slot name="primary" />
                </div>
                <div v-if="hasSecondarySlot" :class="theme('secondary')" data-qa="sticky-bar-secondary">
                    <!-- @slot [secondary] Secondary action / contextual info area, pinned to the end of the bar. -->
                    <slot name="secondary" />
                </div>
            </template>
            <slot v-else />
        </div>
        <div :class="theme('gradient')" data-qa="sticky-bar-gradient" />
    </div>
</template>

<style scoped></style>
