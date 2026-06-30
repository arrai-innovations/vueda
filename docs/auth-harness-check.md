---
title: Auth Harness Check
status: brainstorming
audience: contributor
type: reference
---

<script setup>
import { LOGGED_IN, MFA_PENDING, TWO_FACTOR_METHODS, formError } from "./.vitepress/theme/fixtures/authUser.js";
</script>

# Auth Harness Check

Scratch page validating the AuthDemo harness against real auth views.

## ViewChangePassword (live)

<ClientOnly>
<VuedaDemo>
<AuthDemo
  :view="() => import('@vueda/views/ViewChangePassword.vue')"
  :state="LOGGED_IN"
  routeName="reauthenticate"
  :mocks="{ changePassword: () => ({}) }"
/>
</VuedaDemo>
</ClientOnly>

## ViewTwoFactorAuth (live)

<ClientOnly>
<VuedaDemo>
<AuthDemo
  :view="() => import('@vueda/views/ViewTwoFactorAuth.vue')"
  :state="MFA_PENDING"
  routeName="2fa"
  :mocks="{
    getTwoFactorAuthMethod: () => ({ methods: TWO_FACTOR_METHODS }),
    sendTwoFactorAuthenticationCode: () => ({}),
    twoFactorAuthenticate: () => ({}),
  }"
/>
</VuedaDemo>
</ClientOnly>
