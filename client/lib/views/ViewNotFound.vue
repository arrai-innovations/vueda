<script setup>
import Button from "@vueda/controls/button/Button.vue";
import DiagnosticStrip from "@vueda/display/system-message/DiagnosticStrip.vue";
import SuggestionList from "@vueda/display/system-message/SuggestionList.vue";
import SystemMessageCard from "@vueda/display/system-message/SystemMessageCard.vue";
import TriedUrlCallout from "@vueda/display/system-message/TriedUrlCallout.vue";
import "@vueda/theme/vueda-tailwind/views/ViewNotFound.theme.js";
import { ICON_OVERRIDE_PROPS, useIconsOverride } from "@vueda/use/useIcons.js";
import { useSuggestRoutes } from "@vueda/use/useSuggestRoute.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, toRef } from "vue";
import { useRouter } from "vue-router";

/**
 * Full-page 404 error view displayed when a route path does not match any
 * registered route. Composes `SystemMessageCard(tone="info")` with a "404" crest,
 * a `TriedUrlCallout` highlighting the segments of the typed path that diverge
 * from the closest matching route, a `SuggestionList(shape="route")` of N-best
 * scored matches, a `DiagnosticStrip` debug footer, and a `Back` + `Go to home`
 * actions row.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /**
     * Maximum number of suggested routes to display.
     */
    suggestionLimit: { type: Number, default: 5 },
    /**
     * Path to navigate to when the operator clicks "Go to home". Defaults to "/".
     */
    homePath: { type: String, default: "/" },
    /**
     * Extra rows appended to the `DiagnosticStrip` (after the route row). Each entry
     * is `{ label, value }`. Useful for wiring `request id` and `session` from the
     * consuming app's interceptor + user store.
     *
     * @type {{ label: string, value: string }[]}
     */
    diagnostics: { type: Array, default: () => [] },
});

const router = useRouter();
const suggestedRoutes = useSuggestRoutes({ limit: props.suggestionLimit });
const theme = useTheme("ViewNotFound", props);
useIconsOverride(toRef(props, "iconOverride"));

const currentPath = computed(() => router.currentRoute.value.path);

const triedSegments = computed(() => {
    const path = currentPath.value;
    const bestMatch = suggestedRoutes.value[0]?.matchedPath;
    const currentParts = path.split("/").filter(Boolean);
    if (!bestMatch) {
        return currentParts.map((text) => ({ text: "/" + text, bad: true }));
    }
    const matchParts = bestMatch.split("/").filter(Boolean);
    return currentParts.map((text, i) => {
        const m = matchParts[i] ?? "";
        const isParam = m.startsWith(":");
        const matches = text === m || (isParam && /^[0-9]+$/.test(text));
        return { text: "/" + text, bad: !matches };
    });
});

const suggestionItems = computed(() =>
    suggestedRoutes.value.map((s) => ({
        label: s.matchedPath,
        score: s.score,
        to: s.route,
    })),
);

const diagnosticRows = computed(() => [{ label: "route", value: currentPath.value }, ...props.diagnostics]);

function handleBack() {
    router.back();
}

function handleHome() {
    router.push(props.homePath);
}
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" v-bind="$attrs" data-qa="view-not-found-root">
        <system-message-card
            tone="info"
            icon-name="notFound"
            :icon-override="props.iconOverride"
            data-qa="view-not-found-card"
        >
            <template #crest-eyebrow>Route not found</template>
            <template #crest-kind>{{ currentPath }}</template>
            <template #crest-code>404</template>

            <!-- @slot blurb Override the default explanatory paragraph beneath the crest. -->
            <slot name="blurb">
                <p :class="theme('blurb')" data-qa="view-not-found-blurb">
                    No registered route matched this path. The closest matches in the router are listed below.
                </p>
            </slot>

            <tried-url-callout :segments="triedSegments" label="You tried" data-qa="view-not-found-tried" />

            <suggestion-list
                v-if="suggestionItems.length"
                :items="suggestionItems"
                head="Did you mean"
                source="router.suggest()"
                shape="route"
                data-qa="view-not-found-suggestions"
            />

            <diagnostic-strip :rows="diagnosticRows" data-qa="view-not-found-diagnostics" />

            <template #actions>
                <!-- @slot actions Override the default Back / Go to home button row. -->
                <slot name="actions">
                    <Button emphasis="ghost" data-qa="view-not-found-back" @click="handleBack">Back</Button>
                    <Button tone="primary" class="ml-auto" data-qa="view-not-found-home" @click="handleHome"
                        >Go to home</Button
                    >
                </slot>
            </template>
        </system-message-card>
    </div>
</template>
