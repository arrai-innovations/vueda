import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive } from "vue";

const navState = reactive({ navigation: [] });
const mockedUseNavigation = vi.fn(() => navState);
vi.mock("@vueda/use/useNavigation.js", () => ({ useNavigation: mockedUseNavigation }));

const NavigationItemStub = defineComponent({
    name: "NavigationItemStub",
    props: ["item"],
    setup(props) {
        return () =>
            h(
                "li",
                {
                    "data-qa": "navigation-item",
                    "data-name": props.item.name,
                    "data-link": props.item.link || "",
                },
                [],
            );
    },
});
vi.mock("@vueda/components/NavigationItem.vue", () => ({ default: NavigationItemStub }));

let NavigationDisplay;

beforeEach(async () => {
    mockedUseNavigation.mockClear();
    navState.navigation = [{ name: "A", link: "/a", children: [] }];
    NavigationDisplay = (await import("@vueda/components/NavigationDisplay.vue")).default;
});

describe("lib/components/NavigationDisplay.vue", () => {
    scopedIt("renders navigation items from useNavigation", () => {
        const wrapper = mount(NavigationDisplay);
        const items = wrapper.findAll('[data-qa="navigation-item"]');
        expect(mockedUseNavigation).toHaveBeenCalled();
        expect(items.length).toBe(1);
        expect(items[0].attributes("data-name")).toBe("A");
    });

    scopedIt("updates when navigation changes", async () => {
        const wrapper = mount(NavigationDisplay);
        navState.navigation.push({ name: "B", link: null, children: [] });
        await nextTick();
        const items = wrapper.findAll('[data-qa="navigation-item"]');
        expect(items.length).toBe(2);
        expect(items[1].attributes("data-name")).toBe("B");
    });
});
