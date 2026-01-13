import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FormValidationError } from "@vueda/utils/errors.js";
import { defineComponent, h, nextTick } from "vue";

const MessageStub = defineComponent({
    name: "MessageStub",
    props: ["closable", "severity"],
    emits: ["close"],
    setup(props, { emit, slots }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "message",
                    "data-closable": String(props.closable),
                    "data-severity": props.severity,
                    onClick: () => emit("close"),
                },
                slots.default ? slots.default() : null,
            );
    },
});

const RouterLinkStub = defineComponent({
    name: "RouterLinkStub",
    props: ["to"],
    setup(props, { slots }) {
        return () =>
            h(
                "a",
                {
                    "data-qa": "router-link",
                    "data-to": typeof props.to === "string" ? props.to : JSON.stringify(props.to),
                },
                slots.default ? slots.default() : null,
            );
    },
});

const mockedUseTheme = vi.fn(() => () => "cls");
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

const mockedFormatError = vi.fn(() => "formatted-error");
vi.mock("@vueda/utils/formatError.js", () => ({ formatError: mockedFormatError }));

const captureException = vi.fn();
vi.mock("@sentry/vue", () => ({ captureException }));

vi.mock("primevue/message", () => ({ default: MessageStub }));
vi.mock("vue-router", () => ({ RouterLink: RouterLinkStub }));

let ErrorDisplay;
let originalDev;

beforeEach(async () => {
    await import("vue");
    ErrorDisplay = (await import("@vueda/components/ErrorDisplay.vue")).default;
    originalDev = import.meta.env.DEV;
    mockedUseTheme.mockClear();
    mockedFormatError.mockClear();
    captureException.mockClear();
});

afterEach(() => {
    import.meta.env.DEV = originalDev;
    vi.clearAllMocks();
});

scopedIt("does not render when not errored", async () => {
    const wrapper = mount(ErrorDisplay, { global: { stubs: { RouterLink: RouterLinkStub } } });
    await nextTick();
    expect(wrapper.find('[data-qa="message"]').exists()).toBe(false);
    expect(captureException).not.toHaveBeenCalled();
});

scopedIt("reports and displays error", async () => {
    import.meta.env.DEV = true;
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("oops");
    const wrapper = mount(ErrorDisplay, {
        props: { errored: true, error },
        global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await nextTick();
    expect(captureException).toHaveBeenCalledWith(error);
    expect(consoleSpy).toHaveBeenCalledWith(error);
    expect(mockedFormatError).toHaveBeenCalledWith(error);
    expect(wrapper.find('[data-qa="message"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("There was an error while loading.");
    expect(wrapper.find("pre code").text()).toBe("formatted-error");
});

scopedIt("shows dismiss button and redirect link", async () => {
    const error = new Error("bad");
    const wrapper = mount(ErrorDisplay, {
        props: {
            errored: true,
            error,
            redirectParams: "/foo",
            redirectTitle: "Back",
        },
        attrs: { onDismissError: () => {} },
        global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await nextTick();
    const msg = wrapper.find('[data-qa="message"]');
    await msg.trigger("click");
    expect(wrapper.emitted("dismiss-error")).toBeTruthy();
    const link = wrapper.find('[data-qa="router-link"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes("data-to")).toBe("/foo");
    expect(link.text()).toBe("Back");
});

scopedIt("ignores validation and aborted errors", async () => {
    import.meta.env.DEV = true;
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const formErr = new FormValidationError({}, new Response());
    mount(ErrorDisplay, {
        props: { errored: true, error: formErr, ignoreFormValidationErrors: true },
        global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await nextTick();
    expect(captureException).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();

    const aborted = new Error("request aborted");
    captureException.mockClear();
    consoleSpy.mockClear();
    mount(ErrorDisplay, {
        props: { errored: true, error: aborted },
        global: { stubs: { RouterLink: RouterLinkStub } },
    });
    await nextTick();
    expect(captureException).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
});
