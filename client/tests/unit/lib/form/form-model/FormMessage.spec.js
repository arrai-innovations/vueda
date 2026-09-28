import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import FormMessage from "@vueda/form/form-model/FormMessage.vue";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { reactive } from "vue";

function mountFormMessage(type, state) {
    return mount(FormMessage, {
        props: { type },
        global: { provide: { [FormContextSymbol]: { state: reactive(state) } } },
    });
}

describe("lib/form/form-model/FormMessage.vue", () => {
    describe("First-error scroll target", () => {
        scopedIt("renders a non_field_errors anchor beside form-level errors", () => {
            const wrapper = mountFormMessage("error", {
                errors: { non_field_errors: { server: ["Only one default address is allowed."] } },
            });

            expect(wrapper.find('a[name="non_field_errors"]').exists()).toBe(true);
            expect(wrapper.text()).toContain("Only one default address is allowed.");
        });

        scopedIt("renders no anchor for form-level warnings", () => {
            const wrapper = mountFormMessage("message", {
                messages: { non_field_errors: { server: ["Unusual quantity."] } },
            });

            expect(wrapper.find('a[name="non_field_errors"]').exists()).toBe(false);
        });

        scopedIt("renders nothing when there are no form-level errors", () => {
            const wrapper = mountFormMessage("error", { errors: {} });

            expect(wrapper.find('a[name="non_field_errors"]').exists()).toBe(false);
        });
    });
});
