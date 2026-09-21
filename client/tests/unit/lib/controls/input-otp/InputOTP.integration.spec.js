import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import InputOTP from "@vueda/controls/input-otp/InputOTP.vue";
import InputOTPGroup from "@vueda/controls/input-otp/InputOTPGroup.vue";
import InputOTPSlot from "@vueda/controls/input-otp/InputOTPSlot.vue";
import { h, nextTick } from "vue";

// Exercise the real dependency, including the workspace's shadow DOM patch.
const mounted = [];
const hosts = [];
function renderOTP(shadow, defaultValue = "1234", target) {
    if (!target) {
        const host = document.createElement("div");
        document.body.append(host);
        hosts.push(host);
        const root = shadow ? host.attachShadow({ mode: "open" }) : host;
        target = document.createElement("div");
        root.append(target);
    }
    const wrapper = mount(InputOTP, {
        attachTo: target,
        props: { maxlength: 6, defaultValue, pushPasswordManagerStrategy: "none" },
        slots: {
            default: () =>
                h(InputOTPGroup, {}, () => Array.from({ length: 6 }, (_, index) => h(InputOTPSlot, { index }))),
        },
    });
    mounted.push(wrapper);
    return { wrapper, input: wrapper.get("input").element, target };
}
const active = (wrapper) => wrapper.findAll('[data-active="true"]').map((slot) => slot.text());

async function select(input, start, end, eventTarget = document) {
    input.setSelectionRange(start, end);
    eventTarget.dispatchEvent(new Event("selectionchange"));
    await nextTick();
}

describe("lib/controls/input-otp/InputOTP.vue", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal(
            "ResizeObserver",
            class {
                observe() {}
                disconnect() {}
            },
        );
    });
    afterEach(() => {
        mounted.splice(0).forEach((wrapper) => wrapper.unmount());
        hosts.splice(0).forEach((host) => host.remove());
        document.getElementById("input-otp-style")?.remove();
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    for (const shadow of [false, true]) {
        scopedIt(`tracks selection and blur in ${shadow ? "shadow" : "document"} DOM`, async () => {
            const { wrapper, input } = renderOTP(shadow);
            await vi.advanceTimersByTimeAsync(60);
            input.focus();
            await select(input, 1, 2);
            expect(active(wrapper)).toEqual(["2"]);
            await select(input, 2, 4);
            expect(active(wrapper)).toEqual(["3", "4"]);
            await select(input, 4, 4);
            expect(wrapper.findAll(".animate-caret-blink")).toHaveLength(1);
            input.blur();
            await nextTick();
            expect(active(wrapper)).toEqual([]);
            expect(wrapper.findAll(".animate-caret-blink")).toHaveLength(0);
        });
    }

    scopedIt("handles selection events confined to the shadow root", async () => {
        const { wrapper, input } = renderOTP(true);
        await vi.advanceTimersByTimeAsync(60);
        input.focus();
        await select(input, 0, 1, input.getRootNode());
        expect(active(wrapper)).toEqual(["1"]);
    });

    scopedIt("keeps focus independent between shadow roots", async () => {
        const first = renderOTP(true);
        const second = renderOTP(true, "5678");
        await vi.advanceTimersByTimeAsync(60);
        first.input.focus();
        await select(first.input, 0, 1);
        expect(active(first.wrapper)).toEqual(["1"]);
        expect(active(second.wrapper)).toEqual([]);
        second.input.focus();
        await select(second.input, 1, 2);
        expect(active(first.wrapper)).toEqual([]);
        expect(active(second.wrapper)).toEqual(["6"]);
    });

    scopedIt("can mount before attachment to a document", () => {
        const wrapper = mount(InputOTP, { props: { maxlength: 6, pushPasswordManagerStrategy: "none" } });
        mounted.push(wrapper);
        expect(wrapper.find("input").exists()).toBe(true);
    });

    scopedIt("installs native input styles once per DOM root", () => {
        const first = renderOTP(true);
        renderOTP(true, "", first.target);
        const second = renderOTP(true);
        renderOTP(false);
        for (const root of [first.input.getRootNode(), second.input.getRootNode(), document]) {
            expect(root.querySelectorAll("#input-otp-style")).toHaveLength(1);
        }
    });
});
