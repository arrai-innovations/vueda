<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import omit from "lodash-es/omit.js";
import { computed, onBeforeUnmount, onMounted, reactive, ref, useTemplateRef, watch } from "vue";

const root = useTemplateRef("root");
const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
});

const isScrollingUp = ref(false);
const rootThreshold = ref(0);
const lastScrollY = ref(0);

const isScrolledPastThreshold = computed(() => lastScrollY.value > rootThreshold.value);

const handleScroll = () => {
    const currentScrollY = window.scrollY;
    isScrollingUp.value = currentScrollY < lastScrollY.value;
    lastScrollY.value = currentScrollY;
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
