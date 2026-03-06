<script setup>
import NavigationItem from "@vueda/components/NavigationItem.vue";
import { useNavigation } from "@vueda/use/useNavigation.js";
import { reactive } from "vue";

/**
 * Renders a full navigation menu from a user configuration object containing
 * apps, models, and custom routes. Delegates individual item rendering to
 * NavigationItem and uses `useNavigation` to build the navigation tree.
 */
defineOptions({});

const userConfig = reactive({
    apps: [
        {
            name: "App1",
            link: "/app1",
            models: [
                { name: "Model1", actions: ["list", "create", "update"], link: "/app1/model1" },
                { name: "Model2", actions: ["list", "read"], link: "/app1/model2" },
            ],
        },
        {
            name: "App2",
            models: [{ name: "Model3", actions: ["list", "update"], link: "/app2/model3" }],
        },
    ],
    customRoutes: [
        { name: "CustomRoute1", link: "/custom-route-1" },
        { name: "CustomRoute2", link: "/custom-route-2" },
    ],
});

const navigation = useNavigation(userConfig);
</script>
<template>
    <nav>
        <ul>
            <NavigationItem v-for="(item, index) in navigation.navigation" :key="index" :item="item" />
        </ul>
    </nav>
</template>
