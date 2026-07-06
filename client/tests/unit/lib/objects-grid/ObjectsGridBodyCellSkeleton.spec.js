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

describe("lib/objects-grid/ObjectsGridBodyCellSkeleton.vue", () => {
    let ObjectsGridBodyCellSkeleton;

    beforeEach(async () => {
        ObjectsGridBodyCellSkeleton = (await import("@vueda/objects-grid/ObjectsGridBodyCellSkeleton.vue")).default;
        getSkeletonClassForField.mockClear();
        mockedUseTheme.mockClear();
        themeFn.mockClear();
    });

    scopedIt("renders skeleton with theme class and field-based sizing", () => {
        const field = { name: "foo", label: "Foo" };
        const wrapper = mount(ObjectsGridBodyCellSkeleton, { props: { field } });
        expect(mockedUseTheme).toHaveBeenCalledWith("ObjectsGridBodyCell", expect.any(Object));
        expect(wrapper.classes()).toContain("theme-root");
        expect(getSkeletonClassForField).toHaveBeenCalledWith(field);
        const skeleton = wrapper.getComponent(SkeletonStub);
        expect(skeleton.classes()).toContain("h-6");
        expect(skeleton.classes()).toContain("w-24");
    });
});
