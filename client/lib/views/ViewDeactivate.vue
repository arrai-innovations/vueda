<script setup>
import Button from "@vueda/controls/button/Button.vue";
import ConsequencesBullets from "@vueda/display/consequences-bullets/ConsequencesBullets.vue";
import SystemMessageCard from "@vueda/display/system-message/SystemMessageCard.vue";
import TypedConfirmField from "@vueda/form/confirm/TypedConfirmField.vue";
import { storeUser } from "@vueda/stores/storeUser.js";
import "@vueda/theme/vueda-tailwind/views/ViewDeactivate.theme.js";
import { ICON_OVERRIDE_PROPS, useIconsOverride } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { getDetailUrl, getListUrl } from "@vueda/utils/urls.js";
import { computed, ref, toRef } from "vue";
import { useRouter } from "vue-router";

/**
 * Self-service account deactivation view. Wraps the deactivate action in a
 * warning-toned `SystemMessageCard` chassis: an icon crest identifies the
 * action, an optional `ConsequencesBullets` list communicates the impact, and
 * a `TypedConfirmField` gates the destructive button on the operator typing
 * their own email address. Sends a PATCH to the model's deactivate endpoint
 * on confirmation.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name whose instance will be deactivated. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key or array of primary keys identifying the instances to deactivate. */
    pk: {
        type: [String, Array],
        required: true,
    },
    /**
     * Consequence rows forwarded to `ConsequencesBullets`. When empty no
     * bullets section is rendered. Each entry follows the
     * `{ icon?, label, description?, tone? }` shape from `ConsequencesBullets`.
     *
     * @type {{ icon?: string, label: string, description?: string, tone?: ('default'|'warn'|'danger') }[]}
     */
    consequences: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits([
    /** Emitted after the deactivate PATCH succeeds. */
    "success",
]);

const userStore = storeUser();
const expectedConfirmValue = computed(() => userStore.loggedInUser?.email || "");

const theme = useTheme("ViewDeactivate", props);
useIconsOverride(toRef(props, "iconOverride"));

const router = useRouter();

const confirmMatch = ref(false);
const isSubmitting = ref(false);
const submitError = ref(null);

async function handleDeactivate() {
    if (!confirmMatch.value || isSubmitting.value) {
        return;
    }
    isSubmitting.value = true;
    submitError.value = null;
    try {
        const { app, model, pk } = props;
        const action = "deactivate";
        // One object uses its detail action URL; several go to the list action URL as `pks`.
        const bulk = Array.isArray(pk);
        const url = bulk ? getListUrl({ app, model, action }) : getDetailUrl({ app, model, pk, action });
        const response = await fetch(url, {
            method: "PATCH",
            headers: {
                "X-CSRFToken": getCSRFValue(),
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: bulk ? JSON.stringify({ pks: pk }) : undefined,
        });
        if (response.status !== 200) {
            const body = await getJsonOrText(response);
            throw new FetchError("Failed to deactivate account", response, body);
        }
        emit("success");
    } catch (err) {
        submitError.value = err?.message || "Deactivation failed. Please try again.";
    } finally {
        isSubmitting.value = false;
    }
}

function handleCancel() {
    router.back();
}
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" data-qa="view-deactivate-root" v-bind="$attrs">
        <system-message-card
            tone="warning"
            icon-name="warning"
            :icon-override="props.iconOverride"
            data-qa="view-deactivate-card"
        >
            <template #crest-eyebrow>{{ model }} · deactivate</template>
            <template #crest-kind>{{ app }}/{{ model }}/deactivate</template>
            <!-- @slot message Override the default suspension explanation paragraph. -->
            <slot name="message">
                <p :class="theme('message')" data-qa="view-deactivate-message">
                    Your account will be suspended. Active sessions will end immediately, API tokens will be disabled,
                    and shared resources will be reassigned. After 30 days this action is permanent.
                </p>
            </slot>
            <consequences-bullets
                v-if="consequences.length"
                :items="consequences"
                data-qa="view-deactivate-consequences"
            />
            <typed-confirm-field
                v-if="expectedConfirmValue"
                :expected-value="expectedConfirmValue"
                label-lead="Type your email address"
                label-tail="to confirm"
                data-qa="view-deactivate-confirm-field"
                @match="confirmMatch = $event"
            />
            <p v-if="submitError" :class="theme('error')" data-qa="view-deactivate-error">{{ submitError }}</p>
            <template #actions>
                <Button emphasis="ghost" data-qa="view-deactivate-cancel" @click="handleCancel">Cancel</Button>
                <Button
                    tone="destructive"
                    class="ml-auto"
                    :disabled="!confirmMatch || isSubmitting || !expectedConfirmValue"
                    data-qa="view-deactivate-submit"
                    @click="handleDeactivate"
                    >Deactivate account</Button
                >
            </template>
        </system-message-card>
    </div>
</template>
