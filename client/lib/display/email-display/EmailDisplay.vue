<script setup>
import "@vueda/theme/vueda-tailwind/display/EmailDisplay.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * Presents an email address as a `mailto:` link. The link text is the address as stored.
 *
 * Only one plain address becomes a link: text, one `@`, then more text, with no whitespace and
 * none of `?`, `&`, `,`, or `;`. Any other value shows as plain text. A `mailto:` URL can carry
 * headers and extra recipients, so a stored value that skipped the server's validator must not
 * add them to the viewer's draft.
 *
 * A null, absent, or empty value renders the same dash that {@link FileDisplay} uses.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** The email address to present. `null`, `undefined`, and `""` render the dash. */
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

const theme = useTheme("EmailDisplay", props);

// One address: no header delimiters (`?`, `&`), no recipient separators (`,`, `;`), no whitespace.
const PLAIN_ADDRESS = /^[^\s@?&,;]+@[^\s@?&,;]+$/;

const isEmpty = computed(() => !props.value);

const isLinkable = computed(() => PLAIN_ADDRESS.test(props.value ?? ""));
</script>

<template>
    <component :is="inline ? 'span' : 'div'" v-bind="$attrs" :class="[theme('root'), props.class]">
        <span v-if="isEmpty" :class="theme('dash')" data-qa="email-display-dash">-</span>
        <a v-else-if="isLinkable" :class="theme('link')" :href="`mailto:${value}`" data-qa="email-display-link">{{
            value
        }}</a>
        <span v-else :class="theme('text')" data-qa="email-display-text">{{ value }}</span>
    </component>
</template>
