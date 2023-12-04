<script setup>
import { RouterLink } from 'vue-router';

defineProps({
    urls: {
        type: Array,
        required: true
    }
})
</script>

<template>
    <header>
        <div>
            <slot name="logo">
                <router-link to="/"><img src="/assets/logo.png" alt="logo"/></router-link>
            </slot>
        </div>
        <nav>
            <ul>
                <template v-for="url in urls">
                    <slot name="nav-item" :url="url">
                        <li>
                            <router-link :to="url.to">{{ url.title }}</router-link>
                        </li>
                    </slot>
                </template>
            </ul>
        </nav>
        <div>
            <div>
                <slot name="user">
                    <router-link to="/login">Login</router-link>
                    <router-link to="/logout">Logout</router-link>
                </slot>
            </div>
            <div>

            </div>
        </div>
    </header>
</template>
