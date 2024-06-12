<script setup>
import storeModelInfo from "@vueda/stores/storeModelInfo";
import { stringSimilarity } from "string-similarity-js";
import { onMounted, ref, toRef, watch } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const app = toRef(route.params, "app");
const model = toRef(route.params, "model");
const action = toRef(route.params, "action");

const modelInfoStore = storeModelInfo();
const suggestions = ref([]);

const fetchModelInfo = async () => {
    try {
        await modelInfoStore.fetchModelInfo(app.value, model.value);
    } catch (error) {
        console.error("Error fetching model info:", error);
    }
};

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

const suggestValidActions = () => {
    const apps = Object.keys(modelInfoStore.modelInfos);
    const closestApp = findClosestMatch(app.value, apps);

    if (!closestApp) {
        return [];
    }

    const models = Object.keys(modelInfoStore.modelInfos[closestApp] || {});
    const closestModel = findClosestMatch(model.value, models);

    if (!closestModel) {
        return [];
    }

    const modelData = modelInfoStore.modelInfos[closestApp][closestModel];
    const actions = modelData?.actions || ["list", "create", "update", "read"];
    const closestAction = findClosestMatch(action.value, actions);

    const suggestions = [
        { name: "list", type: "view", path: `/${closestApp}/${closestModel}/list`, title: `List ${closestModel}` },
    ];

    // if the closest action is also list, skip adding it to the suggestions
    if (closestAction !== "list") {
        suggestions.push({
            name: closestAction,
            type: "action",
            path: `/${closestApp}/${closestModel}/${closestAction}`,
            title: `${closestAction} ${closestModel}`,
        });
    }
    return suggestions;
};

const updateSuggestions = async () => {
    await fetchModelInfo();
    suggestions.value = suggestValidActions();
};

onMounted(updateSuggestions);

watch(
    () => route.params,
    (newParams) => {
        app.value = newParams.app;
        model.value = newParams.model;
        action.value = newParams.action;
        updateSuggestions();
    },
    { immediate: true, deep: true },
);
</script>
<template>
    <div class="flex flex-col items-center justify-center h-screen">
        <h1 class="text-2xl font-bold mb-4">Action Not Found</h1>
        <p class="mb-4">
            The action <strong>{{ action }}</strong> for model <strong>{{ model }}</strong> in app
            <strong>{{ app }}</strong> was not found.
        </p>
        <p class="mb-4">You might want to try one of the following valid actions:</p>
        <ul>
            <li v-for="suggestion in suggestions" :key="suggestion.name">
                <router-link class="text-blue-500 hover:underline" :to="suggestion.path">
                    {{ suggestion.title }}
                </router-link>
            </li>
        </ul>
    </div>
</template>
