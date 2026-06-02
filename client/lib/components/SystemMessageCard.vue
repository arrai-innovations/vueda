<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Centered card chassis for system-level messages: 404, action-not-found,
 * loading, and deactivate confirmation. Provides a tone-tracked 36 px crest
 * icon tile above a border separator, with a meta column (eyebrow + kind
 * label), an optional trailing status code, a default body slot, and an
 * optional actions footer.
 *
 * Tone drives icon-tile background and ink color via the
 * `group/system-message-card` named scope; consumers place any icon
 * component inside the `crest-icon` slot and it inherits the tinted color.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Visual severity of the message. Drives the icon-tile tint.
     *
     * @type {'info'|'warning'|'danger'|'loading'}
     */
    tone: {
        type: String,
        default: "info",
        validator: (v) => ["info", "warning", "danger", "loading"].includes(v),
    },
    /**
     * Additional CSS classes applied to the card root.
     *
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("SystemMessageCard", props);
</script>

<template>
    <div
        data-slot="system-message-card"
        :data-tone="tone"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        data-qa="system-message-card-root"
    >
        <!-- Crest: icon tile + meta column + optional trailing code -->
        <div :class="theme('crest')" data-qa="system-message-card-crest">
            <div :class="theme('crestIcon')" aria-hidden="true" data-qa="system-message-card-crest-icon">
                <!-- @slot crest-icon Icon component placed inside the tone-tinted 36 px tile. -->
                <slot name="crest-icon" />
            </div>
            <div :class="theme('crestMeta')" data-qa="system-message-card-crest-meta">
                <span
                    v-if="$slots['crest-eyebrow']"
                    :class="theme('crestEyebrow')"
                    data-qa="system-message-card-crest-eyebrow"
                >
                    <!-- @slot crest-eyebrow Uppercase eyebrow label above the kind text. -->
                    <slot name="crest-eyebrow" />
                </span>
                <span v-if="$slots['crest-kind']" :class="theme('crestKind')" data-qa="system-message-card-crest-kind">
                    <!-- @slot crest-kind Mono route path, action name, or object kind. -->
                    <slot name="crest-kind" />
                </span>
            </div>
            <span
                v-if="$slots['crest-code']"
                :class="theme('crestCode')"
                aria-hidden="true"
                data-qa="system-message-card-crest-code"
            >
                <!-- @slot crest-code Optional trailing status code (e.g. "404"). Mono 36 px / 600 / tabular-nums. -->
                <slot name="crest-code" />
            </span>
        </div>
        <!-- Body: primary message content -->
        <div :class="theme('body')" data-qa="system-message-card-body">
            <slot />
        </div>
        <!-- Actions: optional footer buttons -->
        <div v-if="$slots.actions" :class="theme('actions')" data-qa="system-message-card-actions">
            <slot name="actions" />
        </div>
    </div>
</template>
