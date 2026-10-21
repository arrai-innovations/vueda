<script setup>
import "@vueda/theme/vueda-tailwind/display/FileDisplay.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * Presents a stored file as a link labelled with the file name, rather than the
 * `{ "name": ..., "url": ... }` object that VUEDA's file and image serializer fields send.
 * A plain string value is read as the file's URL and is also the label. A null, absent, or
 * empty value renders the same dash {@link DateTimeDisplay} uses for an empty date.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** The file to present: a `{ name, url }` object or a URL string. `null`, `undefined`, and `""` render the dash. */
    value: {
        type: [String, Object],
        default: undefined,
    },
    /** Renders without a wrapping block, for use inside a table cell or an existing text row. */
    inline: {
        type: Boolean,
        default: false,
    },
    /**
     * Additional CSS classes applied to the root.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("FileDisplay", props);

const url = computed(() => (typeof props.value === "string" ? props.value : (props.value?.url ?? "")));

const name = computed(() => (typeof props.value === "string" ? props.value : props.value?.name) || url.value);

const isEmpty = computed(() => !name.value);
</script>

<template>
    <component :is="inline ? 'span' : 'div'" v-bind="$attrs" :class="[theme('root'), props.class]">
        <span v-if="isEmpty" :class="theme('dash')" data-qa="file-display-dash">-</span>
        <a v-else-if="url" :class="theme('link')" :href="url" data-qa="file-display-link">{{ name }}</a>
        <span v-else :class="theme('name')" data-qa="file-display-name">{{ name }}</span>
    </component>
</template>
