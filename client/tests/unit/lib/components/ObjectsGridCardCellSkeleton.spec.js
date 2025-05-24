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

let ObjectsGridCardCellSkeleton;

beforeEach(async () => {
    ObjectsGridCardCellSkeleton = (await import("@vueda/components/ObjectsGridCardCellSkeleton.vue")).default;
    getSkeletonPropsForField.mockClear();
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
    expect(getSkeletonPropsForField).toHaveBeenCalledWith(field);
    const skeleton = value.getComponent(SkeletonStub);
    expect(skeleton.attributes("data-shape")).toBe("circle");
});
