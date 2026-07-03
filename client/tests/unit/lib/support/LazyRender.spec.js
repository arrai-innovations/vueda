import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

let intersectionCb;
const useIntersectionObserver = vi.fn((target, cb) => {
    intersectionCb = cb;
    return { stop: vi.fn(), isSupported: true };
});

vi.mock("@vueuse/core", () => ({ useIntersectionObserver }));

describe("lib/support/LazyRender.vue", () => {
    let LazyRender;

    beforeEach(async () => {
        LazyRender = (await import("@vueda/support/LazyRender.vue")).default;
        useIntersectionObserver.mockClear();
        intersectionCb = undefined;
    });

    scopedIt("renders placeholder until intersecting", async () => {
        const wrapper = mount(LazyRender, {
            slots: {
                default: "<div data-qa='default'>default</div>",
                placeholder: "<div data-qa='placeholder'>placeholder</div>",
            },
        });

        expect(wrapper.find('[data-qa="placeholder"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="default"]').exists()).toBe(false);

        expect(useIntersectionObserver).toHaveBeenCalledWith(expect.any(Object), expect.any(Function), { once: true });
        const target = useIntersectionObserver.mock.calls[0][0];
        expect(target.value).toBe(wrapper.find('div[style*="visibility: hidden"]').element);

        intersectionCb([{ isIntersecting: true }]);
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-qa="default"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="placeholder"]').exists()).toBe(false);
        expect(wrapper.find('div[style*="visibility: hidden"]').exists()).toBe(false);
    });
});
