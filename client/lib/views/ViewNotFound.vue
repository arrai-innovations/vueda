<script setup>
import { useSuggestRoute } from "@vueda/use/useSuggestRoute.js";
import { useRouter } from "vue-router";

const router = useRouter();
const suggestedRoute = useSuggestRoute();
</script>

<template>
    <div>
        <h1>Not Found</h1>
        <p>
            The path <code>{{ router.currentRoute.value.path }}</code> was not found.
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
