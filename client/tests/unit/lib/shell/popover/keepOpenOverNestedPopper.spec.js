import { keepOpenOverNestedPopper } from "@vueda/shell/popover/keepOpenOverNestedPopper.js";

describe("lib/shell/popover/keepOpenOverNestedPopper.js", () => {
    const makeEvent = (target) => ({
        detail: { originalEvent: { target } },
        preventDefault: vi.fn(),
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("prevents dismissal when the target is inside a nested Reka popper layer", () => {
        const wrapper = document.createElement("div");
        wrapper.setAttribute("data-reka-popper-content-wrapper", "");
        const option = document.createElement("button");
        wrapper.appendChild(option);
        document.body.appendChild(wrapper);

        const event = makeEvent(option);
        keepOpenOverNestedPopper(event);
        expect(event.preventDefault).toHaveBeenCalledOnce();
    });

    it("allows dismissal for a genuine outside target", () => {
        const outside = document.createElement("div");
        document.body.appendChild(outside);

        const event = makeEvent(outside);
        keepOpenOverNestedPopper(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("does not throw when the event has no resolvable target", () => {
        const event = makeEvent(undefined);
        expect(() => keepOpenOverNestedPopper(event)).not.toThrow();
        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(() => keepOpenOverNestedPopper({})).not.toThrow();
    });
});
