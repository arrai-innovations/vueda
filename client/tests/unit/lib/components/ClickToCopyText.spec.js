import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { defineComponent, h } from "vue";

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["label", "severity", "rounded", "variant", "size", "onClick"],
    setup(props) {
        return () => h("button", { "data-qa": "copy-button", onClick: props.onClick }, props.label);
    },
});
vi.mock("primevue/button", () => ({ default: ButtonStub }));

let copySpy;
let addSpy;
vi.mock("@vueuse/core", () => ({
    useClipboard: () => ({ copy: copySpy }),
}));
vi.mock("primevue/usetoast", () => ({
    useToast: () => ({ add: addSpy }),
}));

describe("lib/components/ClickToCopyText.vue", () => {
    let ClickToCopyText;
    beforeEach(async () => {
        copySpy = vi.fn().mockResolvedValue();
        addSpy = vi.fn();
        ClickToCopyText = (await import("@vueda/components/ClickToCopyText.vue")).default;
    });

    scopedIt("copies text on click and shows default toast", async () => {
        const wrapper = mount(ClickToCopyText, { props: { text: "foo" } });
        const button = wrapper.get("button[data-qa='copy-button']");
        expect(button.text()).toBe("copy");
        await button.trigger("click");
        await flushPromises();
        expect(copySpy).toHaveBeenCalledWith("foo");
        expect(addSpy).toHaveBeenCalledWith({ severity: "success", summary: "foo copied" });
        expect(button.text()).toBe("copy");
    });

    scopedIt("allows customizing toast options", async () => {
        const wrapper = mount(ClickToCopyText, {
            props: { text: "foo", toast: { summary: "done", detail: "yay" } },
        });
        const button = wrapper.get("button[data-qa='copy-button']");
        await button.trigger("click");
        await flushPromises();
        expect(addSpy).toHaveBeenCalledWith({ severity: "success", summary: "done", detail: "yay" });
    });
});
