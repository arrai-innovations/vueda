<script setup>
import Button from "@vueda/controls/button/Button.vue";
import ScopeChip from "@vueda/display/scope/ScopeChip.vue";
import "@vueda/theme/vueda-tailwind/display/ScopeGroup.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

/**
 * Renders a list's active scopes as a strip of {@api vue:component:ScopeChip}s,
 * plus a Clear scopes control when more than one clearable scope is active. A scope is a
 * list constraint supplied by a link or by application code that has no editable
 * input: the chips describe it and offer removal, and the add-filter menu never
 * offers it. The scope-side counterpart to {@api vue:component:FilterGroup}'s chips.
 *
 * Presentational only: the group reports which scopes the reader asked to clear,
 * and the host removes their values.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Active scopes, each `{ name, label, keys, source, clearable }`; `name` and `source` together identify a scope. */
    scopes: {
        type: Array,
        default: () => [],
    },
    /**
     * When true, the chips render as a bare subgroup (no band chrome) for
     * hosting inside a shared {@api vue:component:ConstraintsBar}. When false
     * (default), the chips render as a self-contained strip.
     */
    hosted: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([
    /** Emitted with the array of scope objects the reader asked to clear: one from a chip, every clearable scope from Clear scopes. */
    "clear",
]);

const clearableScopes = computed(() => props.scopes.filter((scope) => scope.clearable !== false));
const clearScope = (scope) => {
    if (scope.clearable !== false) {
        emit("clear", [scope]);
    }
};

const theme = useTheme("ScopeGroup", props);
</script>

<template>
    <div v-if="scopes.length" :class="hosted ? theme('subgroup') : theme('strip')" data-qa="scope-group-strip">
        <span :class="theme('eyebrow')">Scope</span>
        <template v-for="scope in scopes" :key="`${scope.source}:${scope.name}`">
            <!-- @slot Replaces one whole scope chip. Slot props: `scope`, and `clear()`, which asks to clear that scope when it is clearable. -->
            <slot name="scope-chip" :scope="scope" :clear="() => clearScope(scope)">
                <scope-chip :label="scope.label" :clearable="scope.clearable !== false" @clear="clearScope(scope)">
                    <!-- @slot Replaces a scope chip's label text, keeping the chip and its clear control. Slot props: `scope`. -->
                    <slot name="scope-label" :scope="scope">{{ scope.label }}</slot>
                </scope-chip>
            </slot>
        </template>
        <!-- Bulk clear only earns its place with more than one clearable scope; a lone chip is cleared by its own x. -->
        <Button
            v-if="clearableScopes.length > 1"
            emphasis="outline"
            size="sm"
            :class="theme('clear')"
            data-qa="scope-clear"
            @click="emit('clear', [...clearableScopes])"
        >
            Clear scopes
        </Button>
    </div>
</template>
