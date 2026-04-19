<script setup>
import { useSuggestRoute } from "@vueda/use/useSuggestRoute.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useRouter } from "vue-router";

/**
 * Full-page 404 error view displayed when a route path does not match any registered route. Optionally shows a
 * suggested alternative route derived from the closest match in the router, presented as a clickable link.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
});

const router = useRouter();
const suggestedRoute = useSuggestRoute();
const theme = useTheme("ViewNotFound", props);
</script>

<template>
    <div :class="theme('root')" v-bind="$attrs" data-qa="view-not-found-root">
        <h1 :class="theme('title')">Route Not Found</h1>
        <p>
            The path <strong>{{ router.currentRoute.value.path }}</strong> was not found.
        </p>
        <p v-if="suggestedRoute">
            <router-link v-slot="slotProps" custom :to="suggestedRoute">
                Did you mean
                <a :href="slotProps.href" @click="slotProps.navigate">
                    <code>{{ slotProps.href }}</code>
                </a>
                ?
            </router-link>
        </p>
    </div>
</template>
