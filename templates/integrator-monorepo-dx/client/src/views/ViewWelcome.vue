<script setup>
import { storeUser } from "@vueda/stores/storeUser.js";

// A placeholder landing page for signed-in users. The sign-in flow and the router send people here;
// replace it with your application's own home page.
const userStore = storeUser();
</script>

<template>
    <main class="flex flex-col gap-2 p-6">
        <h1 class="text-xl font-semibold">Welcome</h1>
        <p>You are signed in as {{ userStore.loggedInUser?.email }}.</p>
        <p>
            Each model's views are at <code>/:app/:model/:action/</code>, for example <code>/:app/:model/list/</code>.
        </p>
    </main>
</template>
