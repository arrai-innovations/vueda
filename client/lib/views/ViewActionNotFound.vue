<script setup>
import Button from "@vueda/controls/button/Button.vue";
import DiagnosticStrip from "@vueda/display/system-message/DiagnosticStrip.vue";
import SuggestionList from "@vueda/display/system-message/SuggestionList.vue";
import SystemMessageCard from "@vueda/display/system-message/SystemMessageCard.vue";
import TriedUrlCallout from "@vueda/display/system-message/TriedUrlCallout.vue";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import "@vueda/theme/vueda-tailwind/views/ViewActionNotFound.theme.js";
import { ICON_OVERRIDE_PROPS, useIconsOverride } from "@vueda/use/useIcons.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { viewToActionNameMap } from "@vueda/utils/actionMap.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { stringSimilarity } from "string-similarity-js";
import { computed, inject, toRef } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * Error view displayed when a requested model action route does not exist.
 * Composes `SystemMessageCard(tone="info")` with a "404" crest showing the
 * unrecognized `app/model/action` key, a `TriedUrlCallout` highlighting the
 * action segment as the error, a `SuggestionList(shape="action")` listing the
 * closest model's actions by route name, sorted by string similarity to the
 * tried action (detail actions only when the tried route has a pk, which their
 * links reuse),
 * a `DiagnosticStrip` debug footer, and a `Back` + `Browse all actions`
 * actions row. HTTP verb chips in the action shape remain empty until the
 * server exposes per-action verb metadata.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /**
     * Extra rows appended to the `DiagnosticStrip` (after the route row).
     *
     * @type {{ label: string, value: string }[]}
     */
    diagnostics: { type: Array, default: () => [] },
});

const route = useRoute();
const router = useRouter();

const app = toRef(route.params, "app");
const model = toRef(route.params, "model");
const action = toRef(route.params, "action");

const modelInfoStore = storeModelInfo();

if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}

const theme = useTheme("ViewActionNotFound", props);
useIconsOverride(toRef(props, "iconOverride"));

const findClosestMatch = (input, options) => {
    let bestMatch = null;
    let highestSimilarity = 0;
    options.forEach((option) => {
        const similarity = stringSimilarity(input, option);
        if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatch = option;
        }
    });
    return bestMatch;
};

// The store keys model info by `getAppModelDotName`, "app.model". A model name has no dot, so the
// last one separates the two.
const loadedModels = computed(() =>
    Object.keys(modelInfoStore.infos).map((key) => {
        const dot = key.lastIndexOf(".");
        return { key, app: key.slice(0, dot), model: key.slice(dot + 1) };
    }),
);

const closestApp = computed(() => {
    const apps = [...new Set(loadedModels.value.map((entry) => entry.app))];
    return findClosestMatch(app.value, apps);
});

const closestEntry = computed(() => {
    if (!closestApp.value) {
        return null;
    }
    const entries = loadedModels.value.filter((entry) => entry.app === closestApp.value);
    const closest = findClosestMatch(
        model.value,
        entries.map((entry) => entry.model),
    );
    return entries.find((entry) => entry.model === closest) || null;
});

const closestModel = computed(() => closestEntry.value?.model || null);

// Server action names whose route segment differs: `retrieve` is routed as `read`, and
// `partial_update` has no route of its own because `update` serves it.
const actionToRouteName = Object.fromEntries(Object.entries(viewToActionNameMap).map(([view, name]) => [name, view]));
const unroutedActions = new Set(["partial_update"]);

const suggestions = computed(() => {
    if (!closestEntry.value) {
        return [];
    }
    const pk = route.params.pk;
    const base = `/${closestApp.value}/${closestModel.value}`;
    return (modelInfoStore.infos[closestEntry.value.key]?.actions || [])
        .filter(({ name, detail }) => !unroutedActions.has(name) && (!detail || pk))
        .map(({ name, detail }) => {
            const routeName = actionToRouteName[name] || name;
            const path = detail ? `${base}/${routeName}/${pk}` : `${base}/${routeName}`;
            return { name: routeName, path, score: stringSimilarity(action.value || "", routeName) };
        })
        .sort((a, b) => b.score - a.score)
        .map(({ name, path }) => ({ label: name, sub: path, to: path }));
});

const actionKey = computed(() => `${app.value}/${model.value}/${action.value}`);

const triedSegments = computed(() => [
    { text: app.value || "", bad: false },
    { text: "/", bad: false },
    { text: model.value || "", bad: false },
    { text: "/", bad: false },
    { text: action.value || "", bad: true },
]);

const diagnosticRows = computed(() => [{ label: "route", value: route.fullPath }, ...props.diagnostics]);

const browsePath = computed(() =>
    closestApp.value && closestModel.value ? `/${closestApp.value}/${closestModel.value}/list` : "/",
);

function handleBack() {
    router.back();
}

function handleBrowse() {
    router.push(browsePath.value);
}
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" v-bind="$attrs" data-qa="view-action-not-found-root">
        <system-message-card
            tone="info"
            icon-name="actionNotFound"
            :icon-override="props.iconOverride"
            data-qa="view-action-not-found-card"
        >
            <template #crest-eyebrow>Action not found</template>
            <template #crest-kind>{{ actionKey }}</template>
            <template #crest-code>404</template>

            <!-- @slot blurb Override the default explanatory paragraph beneath the crest. -->
            <slot name="blurb">
                <p :class="theme('blurb')" data-qa="view-action-not-found-blurb">
                    No such action is registered for this model. The model's available actions are listed below.
                </p>
            </slot>

            <tried-url-callout :segments="triedSegments" label="Action key" data-qa="view-action-not-found-tried" />

            <suggestion-list
                v-if="suggestions.length"
                :items="suggestions"
                head="Available actions"
                :source="closestModel ? `${closestApp}.${closestModel} · ${suggestions.length}` : undefined"
                shape="action"
                data-qa="view-action-not-found-suggestions"
            />

            <diagnostic-strip :rows="diagnosticRows" data-qa="view-action-not-found-diagnostics" />

            <template #actions>
                <!-- @slot actions Override the default Back / Browse all actions button row. -->
                <slot name="actions">
                    <Button emphasis="ghost" data-qa="view-action-not-found-back" @click="handleBack">Back</Button>
                    <Button
                        v-if="closestApp && closestModel"
                        class="ml-auto"
                        tone="primary"
                        data-qa="view-action-not-found-browse"
                        @click="handleBrowse"
                        >Browse all actions</Button
                    >
                </slot>
            </template>
        </system-message-card>
    </div>
</template>
