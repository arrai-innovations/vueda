/**
 * Stubs shared by the forgot password and reset password view specs.
 */
import { defineComponent, h } from "vue";

/** The props the most recently rendered AuthorizingForm stub received. */
export const lastAuthorizingFormProps = { value: undefined };

export const AuthorizingFormStub = defineComponent({
    name: "AuthorizingFormStub",
    inheritAttrs: false,
    props: [
        "runAction",
        "formProps",
        "header",
        "subTitle",
        "actionErrorSummary",
        "permitted",
        "onSubmissionSuccessHandler",
    ],
    emits: ["form-object", "form-context"],
    setup(props, { slots, attrs }) {
        return () => {
            lastAuthorizingFormProps.value = { ...props, ...attrs };
            return h("div", [
                props.permitted === false
                    ? slots["invalid-message"]?.()
                    : [slots["action-form-inner"]?.({}), slots["action-bar"]?.({ loading: false })],
                slots.suffix?.(),
            ]);
        };
    },
});

export const FormFieldStub = defineComponent({
    name: "FormFieldStub",
    props: ["label", "name", "validation"],
    setup(props, { slots }) {
        return () => h("div", { "data-field": props.name }, slots.default?.());
    },
});

export const PassthroughStub = defineComponent({
    name: "PassthroughStub",
    setup(_, { slots }) {
        return () => h("div", null, slots.default?.());
    },
});

export const RouterLinkStub = defineComponent({
    name: "RouterLink",
    props: ["to"],
    setup(props, { slots }) {
        return () => h("a", { "data-to": JSON.stringify(props.to) }, slots.default?.());
    },
});
