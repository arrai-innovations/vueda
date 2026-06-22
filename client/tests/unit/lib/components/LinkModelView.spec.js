import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

const mockedUseLinkModelView = vi.fn();
vi.mock("@vueda/use/useLinkModelView.js", () => ({
    useLinkModelView: mockedUseLinkModelView,
}));

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["as", "disabled", "href", "variant", "class"],
    emits: ["click"],
    setup(props, { emit, slots }) {
        return () => {
            const children = slots.default?.();
            const textNode = children?.find((c) => typeof c.children === "string");
            const label = textNode?.children;
            return h(
                "button",
                {
                    "data-qa": "prime-button",
                    "data-disabled": String(props.disabled),
                    "data-href": props.href,
                    "data-label": typeof label === "string" ? label.trim() : undefined,
                    class: props.class,
                    onClick: () => emit("click"),
                },
                Object.keys(slots).map((name) => h("div", { "data-slot": name }, slots[name] ? slots[name]() : null)),
            );
        };
    },
});
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));

describe("lib/components/LinkModelView.vue", () => {
    let LinkModelView;

    beforeEach(async () => {
        mockedUseLinkModelView.mockReturnValue({
            href: ref("/path"),
            navigate: vi.fn(),
            actionDisabled: ref(false),
        });
        LinkModelView = (await import("@vueda/components/LinkModelView.vue")).default;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("renders as link by default and forwards props", () => {
        const wrapper = mount(LinkModelView, {
            props: {
                app: "a",
                model: "m",
                pk: "1",
                view: "detail",
                label: "go",
            },
            slots: { default: "<span>slot</span>" },
        });
        expect(mockedUseLinkModelView).toHaveBeenCalledWith(
            expect.objectContaining({ app: "a", model: "m", pk: "1", view: "detail" }),
        );
        const btn = wrapper.get('[data-qa="prime-button"]');
        expect(btn.attributes("data-href")).toBe("/path");
        expect(btn.attributes("data-disabled")).toBe("false");
        expect(btn.attributes("data-label")).toBe("go");
        expect(btn.find('[data-slot="default"]').exists()).toBe(true);
    });

    scopedIt("falls through class to the underlying button", () => {
        const wrapper = mount(LinkModelView, {
            props: { app: "a", model: "m", pk: "1", view: "detail" },
            attrs: { class: "cls" },
        });
        expect(wrapper.get('[data-qa="prime-button"]').classes()).toContain("cls");
    });

    scopedIt("calls navigate when clicked", async () => {
        const navigate = vi.fn();
        mockedUseLinkModelView.mockReturnValueOnce({
            href: ref("/path"),
            navigate,
            actionDisabled: ref(false),
        });
        const wrapper = mount(LinkModelView, {
            props: { app: "a", model: "m", pk: "1", view: "detail" },
        });
        await wrapper.get('[data-qa="prime-button"]').trigger("click");
        expect(navigate).toHaveBeenCalled();
    });

    scopedIt("behaves as button when button prop true", () => {
        mockedUseLinkModelView.mockReturnValueOnce({
            href: ref("/path"),
            navigate: vi.fn(),
            actionDisabled: ref(false),
        });
        const wrapper = mount(LinkModelView, {
            props: { app: "a", model: "m", view: "v", button: true },
        });
        const btn = wrapper.get('[data-qa="prime-button"]');
        expect(btn.attributes("data-href")).toBeUndefined();
        expect(btn.attributes("data-disabled")).toBe("false");
    });

    scopedIt("sets disabled when actionDisabled is true", () => {
        mockedUseLinkModelView.mockReturnValueOnce({
            href: ref("/path"),
            navigate: vi.fn(),
            actionDisabled: ref(true),
        });
        const wrapper = mount(LinkModelView, {
            props: { app: "a", model: "m", view: "v" },
        });
        expect(wrapper.get('[data-qa="prime-button"]').attributes("data-disabled")).toBe("true");
    });
});
