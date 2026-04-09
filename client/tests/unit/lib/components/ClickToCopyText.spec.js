import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { defineComponent, h } from "vue";

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["severity", "rounded", "variant", "size", "onClick"],
    setup(props, { slots }) {
        return () => h("button", { "data-qa": "copy-button", onClick: props.onClick }, slots.default?.());
    },
});
vi.mock("@vueda/controls/button", () => ({ ControlButton: ButtonStub }));

let copySpy;
const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
};
vi.mock("@vueuse/core", () => ({
    useClipboard: () => ({ copy: copySpy }),
}));
vi.mock("vue-sonner", () => ({ toast: toastMock }));

describe("lib/components/ClickToCopyText.vue", () => {
    let ClickToCopyText;
    beforeEach(async () => {
        copySpy = vi.fn().mockResolvedValue();
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        ClickToCopyText = (await import("@vueda/components/ClickToCopyText.vue")).default;
    });

    scopedIt("copies text on click and shows default toast", async () => {
        const wrapper = mount(ClickToCopyText, { props: { text: "foo" } });
        const button = wrapper.get("button[data-qa='copy-button']");
        expect(button.text()).toBe("copy");
        await button.trigger("click");
        await flushPromises();
        expect(copySpy).toHaveBeenCalledWith("foo");
        expect(toastMock.success).toHaveBeenCalledWith("foo copied");
        expect(button.text()).toBe("copy");
    });

    scopedIt("allows customizing toast options", async () => {
        const wrapper = mount(ClickToCopyText, {
            props: { text: "foo", toast: "done" },
        });
        const button = wrapper.get("button[data-qa='copy-button']");
        await button.trigger("click");
        await flushPromises();
        expect(toastMock.success).toHaveBeenCalledWith("done");
    });
});
