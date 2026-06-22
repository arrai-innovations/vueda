import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import PageActions from "@vueda/components/PageActions.vue";
import { PageTitleContextSymbol } from "@vueda/utils/symbols.js";
import { computed, shallowRef } from "vue";

describe("lib/components/PageActions.vue", () => {
    scopedIt("renders its actions inline when no page-title context is provided", () => {
        const wrapper = mount(PageActions, {
            slots: { default: "<button data-qa='action'>Create</button>" },
        });
        expect(wrapper.find('[data-qa="action"]').exists()).toBe(true);
    });

    scopedIt("renders inline when a context exists but has not bound an action zone", () => {
        const wrapper = mount(PageActions, {
            slots: { default: "<button data-qa='action'>Create</button>" },
            global: {
                provide: { [PageTitleContextSymbol]: { actionTarget: computed(() => null) } },
            },
        });
        expect(wrapper.find('[data-qa="action"]').exists()).toBe(true);
    });

    scopedIt("teleports its actions into the bound zone element", () => {
        const target = document.createElement("div");
        document.body.appendChild(target);
        try {
            const wrapper = mount(PageActions, {
                slots: { default: "<button data-qa='action'>Create</button>" },
                global: {
                    provide: { [PageTitleContextSymbol]: { actionTarget: shallowRef(target) } },
                },
            });

            expect(target.querySelector('[data-qa="action"]')).not.toBeNull();
            // the action left the component's own subtree
            expect(wrapper.find('[data-qa="action"]').exists()).toBe(false);
        } finally {
            target.remove();
        }
    });
});
