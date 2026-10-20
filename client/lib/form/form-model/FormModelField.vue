<script>
import FieldRenderer from "@vueda/form/form-model/FieldRenderer.vue";
import { FormModelFieldSlotsSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, inject, onUnmounted } from "vue";

/**
 * Renders one field of the surrounding `FormModel` with that form model's per-field slots, such as
 * `#widget(sku)`, `#field(sku)label`, and `#field-errors`. Use it in a custom `#fields` layout, where
 * a plain `FieldRenderer` would not receive those slots.
 *
 * It accepts every `FieldRenderer` prop and passes it through. A slot passed to `FormModelField`
 * directly wins over the form model's slot with the same name.
 *
 * Uses a render function (not a template), because a template can only render the component's own
 * slots, not the slot functions that the form model provides.
 */
export default defineComponent({
    name: "FormModelField",
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
        /** @type {import('@vueda/use/useFormModelFieldSlots.js').FormModelFieldSlotsContext|null} */
        const formModelSlots = inject(FormModelFieldSlotsSymbol, null);
        const unregister = formModelSlots?.register();
        onUnmounted(() => unregister?.());
        return () => h(FieldRenderer, attrs, { ...formModelSlots?.slots(), ...slots });
    },
});
</script>
