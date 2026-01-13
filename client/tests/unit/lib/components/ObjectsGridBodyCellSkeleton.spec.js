import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const skeletonProps = { shape: "circle" };
const getSkeletonPropsForField = vi.fn(() => skeletonProps);

const themeFn = vi.fn((key) => `theme-${key}`);
const mockedUseTheme = vi.fn(() => themeFn);

const SkeletonStub = defineComponent({
    name: "SkeletonStub",
    props: ["height", "width", "shape"],
    setup(props, { attrs }) {
        return () =>
            h("div", {
                "data-qa": "skeleton",
                "data-height": props.height,
                "data-width": props.width,
                "data-shape": props.shape,
                ...attrs,
            });
    },
});

vi.mock("primevue/skeleton", () => ({ default: SkeletonStub }));
vi.mock("@vueda/utils/objectGridSkeletonProps.js", () => ({ getSkeletonPropsForField }));
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

let ObjectsGridBodyCellSkeleton;

beforeEach(async () => {
    ObjectsGridBodyCellSkeleton = (await import("@vueda/components/ObjectsGridBodyCellSkeleton.vue")).default;
    getSkeletonPropsForField.mockClear();
    mockedUseTheme.mockClear();
    themeFn.mockClear();
});

scopedIt("renders skeleton with theme class and props", () => {
    const field = { name: "foo", label: "Foo" };
    const wrapper = mount(ObjectsGridBodyCellSkeleton, { props: { field } });
    expect(mockedUseTheme).toHaveBeenCalledWith("ObjectsGridBodyCell", expect.any(Object));
    expect(wrapper.classes()).toContain("theme-root");
    expect(getSkeletonPropsForField).toHaveBeenCalledWith(field);
    const skeleton = wrapper.getComponent(SkeletonStub);
    expect(skeleton.attributes("data-height")).toBe("2rem");
    expect(skeleton.attributes("data-width")).toBe("6rem");
    expect(skeleton.attributes("data-shape")).toBe("circle");
});
