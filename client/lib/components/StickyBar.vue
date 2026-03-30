<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import omit from "lodash-es/omit.js";
import { computed, onBeforeUnmount, onMounted, reactive, ref, useTemplateRef, watch } from "vue";

/**
 * Renders a sticky toolbar that hides when the user scrolls down past its
 * initial position and reappears when they scroll back up. Wraps its default
 * slot content in a themed inner container with a decorative gradient element.
 */
defineOptions({});

const root = useTemplateRef("root");
const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
});

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
    <div
        ref="root"
        :class="combineClasses(theme('root'), $attrs.class)"
        data-qa="sticky-bar-root"
        v-bind="omit($attrs, ['class'])"
    >
        <div :class="theme('inner')" data-qa="sticky-bar-inner">
            <slot />
        </div>
        <div :class="theme('gradient')" data-qa="sticky-bar-gradient" />
    </div>
</template>

<style scoped></style>
