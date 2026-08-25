<script setup>
import { computed } from "vue";

/**
 * Internal banner row shared by model-action confirmation surfaces.
 *
 * The parent owns theme keys and icon registration. This component only keeps
 * the DOM structure aligned so the two surfaces cannot drift.
 */
const props = defineProps({
    /** Parent theme resolver, usually returned from `useTheme(...)`. */
    theme: {
        type: Function,
        required: true,
    },
    /** Parent icon resolver, usually returned from `useIcons(...)`. */
    icon: {
        type: Function,
        required: true,
    },
    /** Icon registry name to render in the leading tile. */
    iconName: {
        type: String,
        required: true,
    },
    /** Banner title. */
    title: {
        type: String,
        required: true,
    },
    /** Optional paragraph description rendered below the title. */
    description: {
        type: String,
        default: undefined,
    },
    /** Parent theme key for the description paragraph. */
    descriptionThemeKey: {
        type: String,
        default: "bannerDesc",
    },
    /** QA hook for the banner root. */
    bannerQa: {
        type: String,
        required: true,
    },
    /** QA hook for the title. */
    titleQa: {
        type: String,
        required: true,
    },
    /** QA hook for the description. */
    descriptionQa: {
        type: String,
        default: undefined,
    },
});

const iconEntry = computed(() => props.icon(props.iconName));
</script>

<template>
    <div :class="theme('banner')" :data-qa="bannerQa">
        <div v-if="iconEntry" :class="theme('bannerIcon')" aria-hidden="true">
            <component :is="iconEntry.component" v-bind="iconEntry.props" aria-hidden="true" />
        </div>
        <div :class="theme('bannerBody')">
            <div :class="theme('bannerTitle')" :data-qa="titleQa">
                {{ title }}
            </div>
            <p v-if="$slots.description || description" :class="theme(descriptionThemeKey)" :data-qa="descriptionQa">
                <slot name="description">{{ description }}</slot>
            </p>
            <slot />
        </div>
    </div>
</template>
