import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import SuggestionList from "@vueda/display/system-message/SuggestionList.vue";
import { defineComponent, markRaw } from "vue";

const RouterLinkStub = defineComponent({
    name: "RouterLink",
    props: ["to", "class"],
    template: '<a :href="String(to)" :class="$props.class"><slot /></a>',
});

const mountSuggestionList = (props = {}, options = {}) =>
    mount(SuggestionList, {
        props,
        global: { stubs: { RouterLink: RouterLinkStub }, ...options.global },
        ...options,
    });

describe("lib/display/system-message/SuggestionList.vue", () => {
    describe("root element", () => {
        scopedIt("renders with data-slot='suggestion-list'", () => {
            const wrapper = mountSuggestionList();
            expect(wrapper.attributes("data-slot")).toBe("suggestion-list");
        });

        scopedIt("merges a custom class onto the root", () => {
            const wrapper = mountSuggestionList({ class: "custom-class" });
            expect(wrapper.classes()).toContain("custom-class");
        });
    });

    describe("head row", () => {
        scopedIt("omits the head row when neither head nor source is provided", () => {
            const wrapper = mountSuggestionList();
            expect(wrapper.find('[data-qa="suggestion-list-head-row"]').exists()).toBe(false);
        });

        scopedIt("renders head row when head is provided", () => {
            const wrapper = mountSuggestionList({ head: "Did you mean" });
            expect(wrapper.find('[data-qa="suggestion-list-head-row"]').exists()).toBe(true);
        });

        scopedIt("renders head row when source is provided", () => {
            const wrapper = mountSuggestionList({ source: "router.suggest()" });
            expect(wrapper.find('[data-qa="suggestion-list-head-row"]').exists()).toBe(true);
        });

        scopedIt("renders head text when provided", () => {
            const wrapper = mountSuggestionList({ head: "Did you mean" });
            expect(wrapper.find('[data-qa="suggestion-list-head"]').text()).toBe("Did you mean");
        });

        scopedIt("omits the head span when head is absent", () => {
            const wrapper = mountSuggestionList({ source: "router.suggest()" });
            expect(wrapper.find('[data-qa="suggestion-list-head"]').exists()).toBe(false);
        });

        scopedIt("renders source text when provided", () => {
            const wrapper = mountSuggestionList({ head: "Did you mean", source: "router.suggest()" });
            expect(wrapper.find('[data-qa="suggestion-list-source"]').text()).toBe("router.suggest()");
        });

        scopedIt("omits the source span when source is absent", () => {
            const wrapper = mountSuggestionList({ head: "Did you mean" });
            expect(wrapper.find('[data-qa="suggestion-list-source"]').exists()).toBe(false);
        });
    });

    describe("list rendering", () => {
        scopedIt("always renders the list element", () => {
            const wrapper = mountSuggestionList();
            expect(wrapper.find('[data-qa="suggestion-list-list"]').exists()).toBe(true);
        });

        scopedIt("renders no items when items is empty", () => {
            const wrapper = mountSuggestionList({ items: [] });
            expect(wrapper.findAll('[data-qa="suggestion-list-item"]')).toHaveLength(0);
        });

        scopedIt("renders one item per entry", () => {
            const wrapper = mountSuggestionList({
                items: [
                    { label: "List customers", sub: "/crm/customer/list", to: "/crm/customer/list" },
                    { label: "Create customer", sub: "/crm/customer/create", to: "/crm/customer/create" },
                ],
            });
            expect(wrapper.findAll('[data-qa="suggestion-list-item"]')).toHaveLength(2);
        });

        scopedIt("renders label text in each row", () => {
            const wrapper = mountSuggestionList({
                items: [
                    { label: "List customers", to: "/crm/customer/list" },
                    { label: "Create customer", to: "/crm/customer/create" },
                ],
            });
            const labels = wrapper.findAll('[data-qa="suggestion-list-label"]');
            expect(labels[0].text()).toBe("List customers");
            expect(labels[1].text()).toBe("Create customer");
        });

        scopedIt("renders sub text when provided", () => {
            const wrapper = mountSuggestionList({
                items: [{ label: "List", sub: "/crm/customer/list", to: "/crm/customer/list" }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-sub"]').text()).toBe("/crm/customer/list");
        });

        scopedIt("omits sub when not provided", () => {
            const wrapper = mountSuggestionList({
                items: [{ label: "List", to: "/crm/customer/list" }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-sub"]').exists()).toBe(false);
        });

        scopedIt("passes the to prop to the router-link", () => {
            const wrapper = mountSuggestionList({
                items: [{ label: "List", to: "/crm/customer/list" }],
            });
            const link = wrapper.find("a");
            expect(link.attributes("href")).toBe("/crm/customer/list");
        });
    });

    describe("icon column", () => {
        scopedIt("renders the icon cell for each item", () => {
            const wrapper = mountSuggestionList({
                items: [{ label: "List", to: "/crm/customer/list" }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-icon"]').exists()).toBe(true);
        });

        scopedIt("renders the icon component when provided", () => {
            const FakeIcon = markRaw(defineComponent({ template: '<span data-qa="fake-icon" />' }));
            const wrapper = mountSuggestionList({
                items: [{ icon: FakeIcon, label: "List", to: "/crm/customer/list" }],
            });
            expect(wrapper.find('[data-qa="fake-icon"]').exists()).toBe(true);
        });

        scopedIt("renders no icon component when icon is absent", () => {
            const wrapper = mountSuggestionList({
                items: [{ label: "List", to: "/crm/customer/list" }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-icon"]').text()).toBe("");
        });
    });

    describe("score chip (route shape)", () => {
        scopedIt("shows score chip when shape=route and item.score is set", () => {
            const wrapper = mountSuggestionList({
                shape: "route",
                items: [{ label: "List", to: "/crm/customer/list", score: 0.85 }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-score"]').exists()).toBe(true);
        });

        scopedIt("formats score as percentage integer", () => {
            const wrapper = mountSuggestionList({
                shape: "route",
                items: [{ label: "List", to: "/crm/customer/list", score: 0.85 }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-score"]').text()).toBe("85%");
        });

        scopedIt("rounds score to nearest integer", () => {
            const wrapper = mountSuggestionList({
                shape: "route",
                items: [{ label: "List", to: "/crm/customer/list", score: 0.756 }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-score"]').text()).toBe("76%");
        });

        scopedIt("omits score chip when score is undefined", () => {
            const wrapper = mountSuggestionList({
                shape: "route",
                items: [{ label: "List", to: "/crm/customer/list" }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-score"]').exists()).toBe(false);
        });

        scopedIt("omits score chip when shape=action even if score is set", () => {
            const wrapper = mountSuggestionList({
                shape: "action",
                items: [{ label: "List", to: "/crm/customer/list", score: 0.9 }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-score"]').exists()).toBe(false);
        });
    });

    describe("verb chip (action shape)", () => {
        scopedIt("shows verb chip when shape=action and item.verb is set", () => {
            const wrapper = mountSuggestionList({
                shape: "action",
                items: [{ label: "List", to: "/crm/customer/list", verb: "POST" }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-verb"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="suggestion-list-verb"]').text()).toBe("POST");
        });

        scopedIt("omits verb chip when verb is absent", () => {
            const wrapper = mountSuggestionList({
                shape: "action",
                items: [{ label: "List", to: "/crm/customer/list" }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-verb"]').exists()).toBe(false);
        });

        scopedIt("omits verb chip when shape=route even if verb is set", () => {
            const wrapper = mountSuggestionList({
                shape: "route",
                items: [{ label: "List", to: "/crm/customer/list", verb: "POST" }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-verb"]').exists()).toBe(false);
        });
    });

    describe("chevron column", () => {
        scopedIt("renders the chevron cell for each item", () => {
            const wrapper = mountSuggestionList({
                items: [{ label: "List", to: "/crm/customer/list" }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-chevron"]').exists()).toBe(true);
        });
    });

    describe("themeOverride", () => {
        scopedIt("applies themeOverride to the root", () => {
            const wrapper = mountSuggestionList({
                themeOverride: { SuggestionList: { root: { class: "custom-root" } } },
            });
            expect(wrapper.classes()).toContain("custom-root");
        });

        scopedIt("applies themeOverride to the head", () => {
            const wrapper = mountSuggestionList({
                head: "Did you mean",
                themeOverride: { SuggestionList: { head: { class: "custom-head" } } },
            });
            expect(wrapper.find('[data-qa="suggestion-list-head"]').classes()).toContain("custom-head");
        });

        scopedIt("applies themeOverride to the label", () => {
            const wrapper = mountSuggestionList({
                items: [{ label: "List", to: "/crm/customer/list" }],
                themeOverride: { SuggestionList: { label: { class: "custom-label" } } },
            });
            expect(wrapper.find('[data-qa="suggestion-list-label"]').classes()).toContain("custom-label");
        });

        scopedIt("applies themeOverride to the score chip", () => {
            const wrapper = mountSuggestionList({
                shape: "route",
                items: [{ label: "List", to: "/crm/customer/list", score: 0.9 }],
                themeOverride: { SuggestionList: { score: { class: "custom-score" } } },
            });
            expect(wrapper.find('[data-qa="suggestion-list-score"]').classes()).toContain("custom-score");
        });
    });

    describe("reactivity", () => {
        scopedIt("updates when items prop changes", async () => {
            const wrapper = mountSuggestionList({
                items: [{ label: "List", to: "/crm/customer/list" }],
            });
            expect(wrapper.findAll('[data-qa="suggestion-list-item"]')).toHaveLength(1);

            await wrapper.setProps({
                items: [
                    { label: "List", to: "/crm/customer/list" },
                    { label: "Create", to: "/crm/customer/create" },
                ],
            });
            expect(wrapper.findAll('[data-qa="suggestion-list-item"]')).toHaveLength(2);
        });

        scopedIt("updates when shape prop changes (score <-> verb)", async () => {
            const wrapper = mountSuggestionList({
                shape: "route",
                items: [{ label: "List", to: "/crm/customer/list", score: 0.9, verb: "POST" }],
            });
            expect(wrapper.find('[data-qa="suggestion-list-score"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="suggestion-list-verb"]').exists()).toBe(false);

            await wrapper.setProps({ shape: "action" });
            expect(wrapper.find('[data-qa="suggestion-list-score"]').exists()).toBe(false);
            expect(wrapper.find('[data-qa="suggestion-list-verb"]').exists()).toBe(true);
        });
    });
});
