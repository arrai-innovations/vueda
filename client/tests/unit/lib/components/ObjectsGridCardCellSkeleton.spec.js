import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const skeletonClass = "h-6 w-24";
const getSkeletonClassForField = vi.fn(() => skeletonClass);

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: (key) => `theme-${key}` });
const mockedUseTheme = makeUseThemeMock({ themeFn });

const SkeletonStub = defineComponent({
    name: "FeedbackSkeletonStub",
    props: ["class"],
    setup(props) {
        return () =>
            h("div", {
                "data-qa": "skeleton",
                "data-slot": "skeleton",
                class: props.class,
            });
    },
});

vi.mock("@vueda/feedback/skeleton/Skeleton.vue", () => ({ default: SkeletonStub }));
vi.mock("@vueda/utils/objectGridSkeletonClass.js", () => ({ getSkeletonClassForField }));
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

let ObjectsGridCardCellSkeleton;

beforeEach(async () => {
    ObjectsGridCardCellSkeleton = (await import("@vueda/components/ObjectsGridCardCellSkeleton.vue")).default;
    getSkeletonClassForField.mockClear();
    mockedUseTheme.mockClear();
    themeFn.mockClear();
});

scopedIt("renders header and skeleton with theme classes", () => {
    const field = { name: "bar", label: "Bar" };
    const wrapper = mount(ObjectsGridCardCellSkeleton, { props: { field } });
    expect(mockedUseTheme).toHaveBeenCalledWith("ObjectsGridCardCell", expect.any(Object));
    const divs = wrapper.findAll("div");
    const header = divs[0];
    const value = divs[1];
    expect(header.classes()).toContain("theme-header");
    expect(header.text()).toBe("Bar");
    expect(value.classes()).toContain("theme-value");
    expect(getSkeletonClassForField).toHaveBeenCalledWith(field);
    const skeleton = value.getComponent(SkeletonStub);
    expect(skeleton.classes()).toContain("h-6");
    expect(skeleton.classes()).toContain("w-24");
});
