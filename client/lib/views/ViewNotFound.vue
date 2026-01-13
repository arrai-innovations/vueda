<script setup>
import { useSuggestRoute } from "@vueda/use/useSuggestRoute.js";
import { useRouter } from "vue-router";

const router = useRouter();
const suggestedRoute = useSuggestRoute();
</script>

<template>
    <div class="flex flex-col items-center justify-center h-screen">
        <h1 class="text-2xl font-bold mb-4">Route Not Found</h1>
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
