<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, useSlots } from "vue";

/**
 * Light grouping for long forms: an eyebrow `title` row with an optional
 * `aside` (e.g. "required", "optional during create"), a single bottom
 * hairline closing the head, and a slotted body below for fields and
 * grids. Composes inside `ViewCreate`/`ViewUpdate` `#fields` slots.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes applied to the section root.
     *
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("FormSection", props);
const slots = useSlots();
const hasHead = computed(() => Boolean(slots.title || slots.aside));
</script>

<template>
    <section data-slot="form-section" :class="[theme('root'), props.class]" data-qa="form-section">
        <div v-if="hasHead" :class="theme('head')" data-qa="form-section-head">
            <!-- @slot title Section title; usually a `<FormSectionTitle>`. -->
            <slot name="title" />
            <span v-if="slots.aside" :class="theme('aside')" data-qa="form-section-aside">
                <!-- @slot aside Mono trailing meta next to the title (e.g. "required"). -->
                <slot name="aside" />
            </span>
        </div>
        <slot />
    </section>
</template>
