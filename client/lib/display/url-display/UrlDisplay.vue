<script setup>
import "@vueda/theme/vueda-tailwind/display/UrlDisplay.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * Presents a URL as a link to that URL. The link text is the URL as stored.
 *
 * Only a URL whose scheme is `http` or `https` becomes a link. Any other value, such as a
 * `javascript:` URL or text that does not parse as a URL, shows as plain text. A stored value
 * can skip the server's validator, so the check runs here as well.
 *
 * The link opens in the same tab. It carries `rel="noopener noreferrer"`, so the linked site
 * does not receive the application's URL.
 *
 * A null, absent, or empty value renders the same dash that {@link FileDisplay} uses.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** The URL to present. `null`, `undefined`, and `""` render the dash. */
    value: {
        type: String,
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

const theme = useTheme("UrlDisplay", props);

const WEB_PROTOCOLS = new Set(["http:", "https:"]);

const isEmpty = computed(() => !props.value);

const isLinkable = computed(() => {
    if (isEmpty.value) {
        return false;
    }
    try {
        return WEB_PROTOCOLS.has(new URL(props.value).protocol);
    } catch {
        return false;
    }
});
</script>

<template>
    <component :is="inline ? 'span' : 'div'" v-bind="$attrs" :class="[theme('root'), props.class]">
        <span v-if="isEmpty" :class="theme('dash')" data-qa="url-display-dash">-</span>
        <a
            v-else-if="isLinkable"
            :class="theme('link')"
            :href="value"
            data-qa="url-display-link"
            rel="noopener noreferrer"
            >{{ value }}</a
        >
        <span v-else :class="theme('text')" data-qa="url-display-text">{{ value }}</span>
    </component>
</template>
