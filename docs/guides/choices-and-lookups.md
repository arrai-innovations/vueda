---
title: Choice-Backed Fields and Lookup Models
type: how-to
audience: integrator
status: draft
---

# Choice-Backed Fields and Lookup Models

This guide shows how to give a field a set of options, how to build a widget that loads those options, and how to declare a {@term Lookup} model for a table of codes and names.

A {@term Choice-Backed Field} carries `choices` in its {@term Model Info} entry. The value is either the full list of `{label, value}` pairs, or `true` when the options are another model's rows. Choice values are always strings. [Primary Key and Identifier Discipline](../core-concepts/pk-and-identifier-discipline.md#choice-identifier-value-semantics) explains why.

## Make a Field Choice-Backed

1. Declare the options on the server.
    - For a fixed set, give the model field Django's [`choices`]{@api ext:django:django.db.models.Field.choices}. For a filter, use a [`ChoiceFilter`]{@api ext:django-filter:django_filters.filters.ChoiceFilter}.
    - For another model's rows, add a [`ForeignKey`]{@api ext:django:django.db.models.ForeignKey} or [`ManyToManyField`]{@api ext:django:django.db.models.ManyToManyField} to that model. For a filter, use a [`ModelChoiceFilter`]{@api ext:django-filter:django_filters.filters.ModelChoiceFilter}. To offer the values that a column already holds, use an [`AllValuesFilter`]{@api ext:django-filter:django_filters.filters.AllValuesFilter}.

2. Give the related model a label. Each option shows the related row's {@term Formatted Name}. [Create a CRUD Surface](./create-crud-surface.md#the-formatted-name-contract) describes how to set it.

3. Make the options reachable. The source that the default UI loads options from depends on how you declare the field:

    | Model info `choices` | Declared as                                                                                                                              | Default UI loads options from                                                                                                                                   |
    | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | A list               | Fixed choices on a field or filter                                                                                                       | The list itself, with no request                                                                                                                                |
    | `true`               | A form field with a [`PrimaryKeyRelatedField`]{@api ext:drf:rest_framework.relations.PrimaryKeyRelatedField}, the default for a relation | The related model's list endpoint, searched as the user types                                                                                                   |
    | `true`               | A form field with a [`SlugRelatedField`]{@api ext:drf:rest_framework.relations.SlugRelatedField}                                         | {@api rest:endpoint:GET:/vueda.info/model_info_choices/{app_label}/{model}/{field}/}                                                                            |
    | `true`               | A filter                                                                                                                                 | {@api rest:endpoint:GET:/vueda.info/model_info_filter_choices/{app_label}/{model}/{field}/}, when the filter form opens or the URL holds a value for the filter |

    For the list endpoint, register and route the related model like any other model, as [Create a CRUD Surface](./create-crud-surface.md) describes. Users who fill the field need `read` and `list` on the related model.

    For the choice endpoints, users need `read` on the source model. When the options are another model's rows, they also need `list` on that model. [`ModelInfoChoicesViewSet`]{@api py:class:vueda.info.viewsets.ModelInfoChoicesViewSet} and [`ModelInfoFilterSetChoicesViewSet`]{@api py:class:vueda.info.viewsets.ModelInfoFilterSetChoicesViewSet} describe each endpoint's checks, errors, ordering, and filter narrowing.

4. Check the model info. Request `GET /routes/vueda.info/model_info/<app_label>/<model>/` ({@api rest:endpoint:GET:/vueda.info/model_info/{app_label}/{model}/}). Find the field under `model_fields` or the filter under `model_filtering`. Fixed choices appear as a list. Another model's rows appear as `"choices": true`, with `app_label` and `model` naming the related model.

## Build a Widget That Loads Choices

The default widgets cover most choice-backed fields. Write a custom widget when a field needs a presentation that they do not offer. The widget below shows the options as radio buttons.

1. Write the widget. For a field whose `choices` is `true`, the form passes the widget `fieldApp`, `fieldModel`, and `fieldName`, which name the source model and the field. [`useModelChoices`]{@api js:function:@arrai-innovations/vueda/use/useModelChoices#useModelChoices} loads the options from the field choices endpoint:

    ```vue
    <script setup>
    import { useModelChoices } from "@vueda/use/useModelChoices.js";
    import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
    import { computed, ref, toRef } from "vue";

    const props = defineProps({
        ...WIDGET_PROPS,
        fieldApp: { type: String, required: true },
        fieldModel: { type: String, required: true },
        fieldName: { type: String, required: true },
    });
    const emit = defineEmits([...WIDGET_EMITS]);
    const widget = useWidget(props, emit);

    // Load the options once the field holds a value or gets focus.
    const hasBeenFocused = ref(false);
    const modelChoices = useModelChoices({
        [props.fieldName]: {
            app: toRef(props, "fieldApp"),
            model: toRef(props, "fieldModel"),
            intendToFetch: computed(() => widget.state.combinedValue != null || hasBeenFocused.value),
            isFilter: false,
        },
    });
    const options = computed(() => modelChoices.choices[props.fieldName]?.results ?? []);

    // Choice values are strings, so compare the field's value as a string.
    const selected = computed({
        get: () => (widget.state.combinedValue == null ? null : String(widget.state.combinedValue)),
        set: (value) => {
            widget.state.combinedValue = value;
        },
    });
    </script>

    <template>
        <fieldset @focusin.once="hasBeenFocused = true">
            <label v-for="option in options" :key="option.value">
                <input v-model="selected" type="radio" :value="option.value" :disabled="props.readOnly" />
                {{ option.label }}
            </label>
        </fieldset>
    </template>
    ```

    [`WIDGET_PROPS`]{@api js:property:@arrai-innovations/vueda/use/useWidget#WIDGET_PROPS} and [`useWidget`]{@api js:function:@arrai-innovations/vueda/use/useWidget#useWidget} connect the widget to the form. Set `isFilter: true` to load from the filter choices endpoint instead.

2. Assign the widget to the field with [`setConfig`]{@api js:method:@arrai-innovations/vueda/stores/storeModelConfig#storeModelConfig.setConfig}:

    ```js
    import OrderStateRadios from "./OrderStateRadios.vue";
    import { storeModelConfig } from "@vueda/stores/storeModelConfig.js";

    storeModelConfig().setConfig(
        { app: "store", model: "customerorder" },
        { widgetComponents: { order_state: OrderStateRadios } },
    );
    ```

    [Customize Field and Widget Rendering](./custom-field-widget-rendering.md) describes the widget contract and the other ways to assign a widget.

3. Check the result. Open the create view and focus the field. The browser sends one request to `/routes/vueda.info/model_info_choices/<app_label>/<model>/<field>/`.

The client asks for one page of 200 options per field. Issue [#381](https://github.com/arrai-innovations/vueda/issues/381) tracks reaching rows past the first 200. Each new fetch sends a new request, and components that ask at the same time share one. [Reactive Data Flow](../core-concepts/reactive-data-flow.md#cached-results) describes the choice store.

## Declare a Lookup Model

[`Lookup`]{@api py:class:vueda.core.models.Lookup} is an abstract base for tables of codes and names, such as order states. It subclasses [`FormattedNameBaseModel`]{@api py:class:vueda.core.models.FormattedNameBaseModel}, the base that it shares with `VuedaModel`. It adds a unique `code`, a `name`, and a `formatted_name` column that copies `name`.

1. Declare the model, and point a relation at it:

    ```python
    from django.db import models

    from vueda.core.models import BaseModelMeta, Lookup, VuedaModel


    class OrderState(Lookup):
        class Meta(BaseModelMeta):
            ordering = ["name"]


    class CustomerOrder(VuedaModel):
        name = models.CharField(max_length=255)
        order_state = models.ForeignKey(OrderState, on_delete=models.PROTECT)

        class Meta(BaseModelMeta):
            pass
    ```

    Base each `Meta` on [`BaseModelMeta`]{@api py:class:vueda.core.models.BaseModelMeta}, which gives the model VUEDA's `create`, `read`, `update`, `delete`, and `list` permissions.

2. Add a serializer, filterset, and viewset:

    ```python
    from vueda.core.filters import VuedaFilterSet
    from vueda.core.serializers import VuedaLookupSerializer
    from vueda.core.viewsets import VuedaViewSet


    class OrderStateSerializer(VuedaLookupSerializer):
        class Meta(VuedaLookupSerializer.Meta):
            model = OrderState


    class OrderStateFilterSet(VuedaFilterSet):
        class Meta:
            model = OrderState
            fields = ["id", "code", "name"]


    class OrderStateViewSet(VuedaViewSet):
        queryset = OrderState.objects.all()
        serializer_class = OrderStateSerializer
        filterset_class = OrderStateFilterSet
        search_fields = ["name", "code"]
    ```

    [`VuedaLookupSerializer`]{@api py:class:vueda.core.serializers.VuedaLookupSerializer} lists `id`, `code`, `name`, and `formatted_name`. The form's relation widget sends typed text to `search_fields`. It loads several selected rows at once through the `id` filter.

3. Route the viewset under the model name, and register it in your app's [`ready()`]{@api ext:django:django.apps.AppConfig.ready}:

    ```python
    router.register(r"orderstate", OrderStateViewSet)
    ```

    ```python
    def ready(self):
        from vueda.info import register

        from .serializers import OrderStateSerializer
        from .viewsets import OrderStateViewSet

        register(OrderStateSerializer, OrderStateViewSet)
    ```

    [Create a CRUD Surface](./create-crud-surface.md#router-and-url-wiring) describes the router prefix and [model-info registration](./create-crud-surface.md#model-info-registration).

4. Create and apply the migration. Add the rows through a data migration or the model's CRUD views.

5. Grant permissions. Users who set `order_state` need `read` and `list` on the lookup model, for example `store.read_orderstate` and `store.list_orderstate`. Users who maintain the table also need `create`, `update`, and `delete`.

The model info for `customerorder` now shows `"choices": true` on `order_state`, with `model` set to `orderstate`. The create and update forms search `OrderState` rows and show each row's `formatted_name`.
