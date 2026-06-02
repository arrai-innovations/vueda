<script setup>
import DiagnosticStrip from "@vueda/components/DiagnosticStrip.vue";
import SuggestionList from "@vueda/components/SuggestionList.vue";
import SystemMessageCard from "@vueda/components/SystemMessageCard.vue";
import TriedUrlCallout from "@vueda/components/TriedUrlCallout.vue";
import Button from "@vueda/controls/button/Button.vue";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { stringSimilarity } from "string-similarity-js";
import { computed, inject, toRef } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * Error view displayed when a requested model action route does not exist.
 * Composes `SystemMessageCard(tone="info")` with a "404" crest showing the
 * unrecognized `app/model/action` key, a `TriedUrlCallout` highlighting the
 * action segment as the error, a `SuggestionList(shape="action")` listing all
 * model-defined actions sorted by string similarity to the tried action,
 * a `DiagnosticStrip` debug footer, and a `Back` + `Browse all actions`
 * actions row. HTTP verb chips in the action shape remain empty until the
 * server exposes per-action verb metadata.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
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
const icon = useIcons("ViewActionNotFound");

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

const closestApp = computed(() => {
    const apps = Object.keys(modelInfoStore.infos);
    return findClosestMatch(app.value, apps);
});

const closestModel = computed(() => {
    if (!closestApp.value) return null;
    const models = Object.keys(modelInfoStore.infos[closestApp.value] || {});
    return findClosestMatch(model.value, models);
});

const modelActions = computed(() => {
    if (!closestApp.value || !closestModel.value) return [];
    const modelData = modelInfoStore.infos[closestApp.value][closestModel.value];
    return modelData?.actions || ["list", "create", "update", "read"];
});

const suggestions = computed(() =>
    [...modelActions.value]
        .map((name) => ({ name, score: stringSimilarity(action.value || "", name) }))
        .sort((a, b) => b.score - a.score)
        .map(({ name }) => ({
            label: name,
            sub: `/${closestApp.value}/${closestModel.value}/${name}`,
            to: `/${closestApp.value}/${closestModel.value}/${name}`,
        })),
);

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
        <system-message-card tone="info" data-qa="view-action-not-found-card">
            <template #crest-icon>
                <component
                    :is="icon('actionNotFound').component"
                    v-if="icon('actionNotFound')"
                    v-bind="icon('actionNotFound').props"
                    aria-hidden="true"
                />
            </template>
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
                    <Button variant="outline" data-qa="view-action-not-found-back" @click="handleBack">Back</Button>
                    <Button
                        v-if="closestApp && closestModel"
                        class="ml-auto"
                        data-qa="view-action-not-found-browse"
                        @click="handleBrowse"
                        >Browse all actions</Button
                    >
                </slot>
            </template>
        </system-message-card>
    </div>
</template>
