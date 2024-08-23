# VUEDA Field/Widget System

## Table of Contents

1. **Fields**

    - [FieldArray](#FieldArray)
    - [FieldBoolean](#FieldBoolean)
    - [FieldString](#FieldString)
    - [FieldDate](#FieldDate)
    - [FieldDateTime](#FieldDateTime)
    - [FieldDurationSeconds](#FieldDurationSeconds)
    - [FieldEmail](#FieldEmail)
    - [FieldFile](#FieldFile)
    - [FieldImage](#FieldImage)
    - [FieldNumber](#FieldNumber)
    - [FieldIP](#FieldIP)
    - [FieldObject](#FieldObject)
    - [FieldSlug](#FieldSlug)
    - [FieldTime](#FieldTime)
    - [FieldURL](#FieldURL)
    - [FieldUUID](#FieldUUID)

2. **FieldSets**

    - [FieldSetStackedInline](#FieldSetStackedInline)
    - [FieldSetTabularInline](#FieldSetTabularInline)
    - [FieldSetMany](#FieldSetMany)
    - [FieldSetRange](#FieldSetRange)

3. **Widgets**
    - [WidgetAutoComplete](#WidgetAutoComplete)
    - [WidgetCheckbox](#WidgetCheckbox)
    - [WidgetDatePicker](#WidgetDatePicker)
    - [WidgetDurationSeconds](#WidgetDurationSeconds)
    - [WidgetFile](#WidgetFile)
    - [WidgetGenericAutoComplete](#WidgetGenericAutoComplete)
    - [WidgetHTML](#WidgetHTML)
    - [WidgetIP](#WidgetIP)
    - [WidgetImage](#WidgetImage)
    - [WidgetInput](#WidgetInput)
    - [WidgetJSON](#WidgetJSON)
    - [WidgetMultiSelect](#WidgetMultiSelect)
    - [WidgetRadio](#WidgetRadio)
    - [WidgetReadOnly](#WidgetReadOnly)
    - [WidgetSelect](#WidgetSelect)
    - [WidgetSlider](#WidgetSlider)
    - [WidgetTag](#WidgetTag)
    - [WidgetTextarea](#WidgetTextarea)
    - [WidgetTriStateCheckbox](#WidgetTriStateCheckbox)

## Fields

**Props**:
All fields have the following props:

-   `name` (`String`): The name of the field
-   `required` (`Boolean`): Whether the field is required
-   `requiredMessage` (`String`): Error message to display if the field is required
-   `label` (`String`): The label of the field
-   `help` (`String`): Help text to display below the field
-   `validate` (`Function`): Custom validation function
-   `requiredFn` (`Function`): Custom function to determine if the field is required
    The default is `(value) => value !== null && value !== undefined && value !== "" && value !== false && value !== 0`

**Slots**:
All fields take a default slot for the widget component. No slot props are passed to the widget component. Widget's get
context by injecting the field context for their related field.

**Emits**:
All fields emit `update:modelValue` with the new value when the value changes.

**Error Codes**:

-   `required`: requiredMessage || "This field is required."

### FieldArray

`FieldArray` is for arrays of values where the form will treat the array as a single value, with a single widget.
For example, a list of tags rendered by a `WidgetTag` widget.

**JSON Type**: `Array`

**Type Coercion**: None

**Extra Props**: None

**Error Codes**: None

### FieldBoolean

**JSON Type**: `Boolean`

**Type Coercion**: `true` or `false`

**Extra Props**: None

**Error Codes**: None

### FieldString

**JSON Type**: `String`

**Type Coercion**: `String`, via `toString()`

**Extra Props**:

-   `minLength` (`Number`): Minimum length of the string
-   `maxLength` (`Number`): Maximum length of the string
-   `patternRegex` (`String`): Regular expression pattern to match the string
-   `patternForMessage` (`String`): Error message to display if the pattern does not match
-   `trim` (`Boolean`): Values are trimmed as they are updated.

**Error Codes**:

-   `minLength`: `Must be ${minLength} characters or more.`
-   `maxLength`: `Must be ${maxLength} characters or less.`
-   `pattern`: `Must match "${patternForMessage || patternRegex}".`

### FieldDate

**JSON Type**: `String`

**Type Coercion**: `Date` objects are converted to `YYYY-MM-DD` strings.

**Extra Props**:

-   `maxValue` (`Date`|`String`): Maximum date value, time is ignored
-   `minValue` (`Date`|`String`): Minimum date value, time is ignored

**Error Codes**:

-   `maxValue`: `Must be ${maxValue} or less.`
-   `minValue`: `Must be ${minValue} or more.`

### FieldDateTime

**JSON Type**: `String`

**Type Coercion**: `Date` objects are converted to `YYYY-MM-DDTHH:MM:SS` strings.

**Extra Props**:

-   `maxValue` (`Date`|`String`): Maximum date time value
-   `minValue` (`Date`|`String`): Minimum date time value

**Error Codes**:

-   `maxValue`: `Must be ${maxValue} or less.`
-   `minValue`: `Must be ${minValue} or more.`

### FieldDurationSeconds

A specialized number field for durations in seconds.

**JSON Type**: `Number`

**Type Coercion**: Invalid values become `0`.

**Extra Props**: None

**Error Codes**: None

### FieldEmail

A specialized string field for email addresses. Email validation can be complicated, we keep it simple with the regex
`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.

**JSON Type**: `String`

**Type Coercion**: `String`, via `toString()`

**Extra Props**: None

**Error Codes**:

-   `pattern`: `Must be a valid email address.`

### FieldFile

`//todo: I don't remember how file and image fields work via django-rest-framework but we need to support what they do.`

### FieldImage

`//todo: I don't remember how file and image fields work via django-rest-framework but we need to support what they do.`

### FieldNumber

**JSON Type**: `Number`

**Type Coercion**: `Number`, `NaN` becomes `undefined`.

**Extra Props**:

-   `maxValue` (`Number`): Maximum number value
-   `minValue` (`Number`): Minimum number value
-   `step` (`Number`): Step value for the number input

**Error Codes**:

-   `maxValue`: `Must be ${maxValue} or less.`
-   `minValue`: `Must be ${minValue} or more.`
-   `step`: `Must be a multiple of ${step}.`

### FieldIP

A specialized string field for IPv4 and IPv6 addresses. IPv4 addresses are validated using the regex
`/^(\d{1,3}\.){3}\d{1,3}$/`. IPv6 addresses are validated using the regex
`/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/`.

**JSON Type**: `String`

**Type Coercion**: `String`, via `toString()`

**Extra Props**:

-   `format` (`String`): Format of the IP address, either `ipv4`, `ipv6` or `both`, default is `both`

**Error Codes**:

-   `pattern`: `Must be a valid IP address.`

### FieldObject

**JSON Type**: `Object`

**Type Coercion**: None

**Extra Props**: None

**Error Codes**: None

### FieldSlug

A specialized string field for generating slugs from a name field. Values must match the regex `/^[a-zA-Z0-9_-]+$/`.
Default values are generated from the `nameField` prop, if provided.

**JSON Type**: `String`

**Type Coercion**: `String`, via `toString()`

**Extra Props**:

-   `minLength` (`Number`): Minimum length of the string
-   `maxLength` (`Number`): Maximum length of the string
-   `nameField` (`String`): Path to the field value used to generate default slug values, if provided.

**Error Codes**:

-   `minLength`: `Must be ${minLength} characters or more.`
-   `maxLength`: `Must be ${maxLength} characters or less.`

### FieldTime

**JSON Type**: `String`

**Type Coercion**: `Date` objects are converted to `HH:MM:SS` strings.

**Extra Props**:

-   `maxValue` (`Date` | `String`): Maximum time value, date is ignored
-   `minValue` (`Date` | `String`): Minimum time value, date is ignored
-   `step` (`Number`): Step value for the time input in seconds, default is `60`

**Error Codes**:

-   `maxValue`: `Must be ${maxValue} or less.`
-   `minValue`: `Must be ${minValue} or more.`
-   `step`: `Must be a multiple of ${step}.`

### FieldURL

A specialized string field for URLs. We validate URLs using `new URL(value)`. Any value that throws an error is
considered invalid.

**JSON Type**: `String`

**Type Coercion**: `String`, via `toString()`

**Extra Props**:

-   `protocol` (`String`): A protocol to require, default is not to force a particular protocol

**Error Codes**:

-   `pattern`: `Must be a valid URL.`
-   `protocol`: `Must be a valid ${protocol} URL.`

### FieldUUID

A specialized string field for UUIDs. Values must match the regex
`/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/`.

**JSON Type**: `String`

**Type Coercion**: `String`, via `toString()`

**Extra Props**: None

**Error Codes**:

-   `pattern`: `Must be a valid UUID.`

## FieldSets

`FieldSets` are meta-fields that render sub-fields in a specific layout or cardinality. They implement the field
interface, to be used as a field in a form. One way they do that is they accept a default slot for a widget component. For
`FieldSetRange` and `FieldSetMany`, the default slot is rendered anywhere a widget is required. The default slot is
ignored for `FieldSetStackedInline` and `FieldSetTabularInline`. Another way they implement the field interface is
they emit `update:modelValue` events with the new value when the value changes. They also have the same props as
fields, and they can be validated like fields. They can be required as all fields can be required.

### FieldSetStackedInline

A `FieldSetStackedInline` renders sub-fields, using a similar layout to the original form. This allows for repeating
sections of fields to be rendered in a form.

`//todo: We should support customization/specification of field components, field props, widget components, and widget
 props for each sub-field. This will allow the inline to be useful outside the context of a FormModel.`

**JSON Type**: `Array`

**Type Coercion**: None

**Extra Props**:

-   `fieldComponents` (`Object`): A map of field paths to desired field components, overriding the default field component
-   `fieldProps` (`Object`): A map of field paths to desired field props, supplementing or overriding the default field
    props by key.
-   `widgetComponents` (`Object`): A map of field paths to desired widget components, overriding the default widget
    component.
-   `widgetProps` (`Object`): A map of field paths to desired widget props, supplementing or overriding the default widget
    props by key.

**Error Codes**: None

### FieldSetTabularInline

A `FieldSetTabularInline` renders sub-fields re-using `ObjectsGrid`, the component used to render objects in list views.
This allows for repeating sections of fields to be rendered in a form.

**JSON Type**: `Array`

**Type Coercion**: None

**Extra Props**:

-   `fieldComponents` (`Object`): A map of field paths to desired field components, overriding the default field component
-   `fieldProps` (`Object`): A map of field paths to desired field props, supplementing or overriding the default field
    props by key.
-   `widgetComponents` (`Object`): A map of field paths to desired widget components, overriding the default widget
    component.
-   `widgetProps` (`Object`): A map of field paths to desired widget props, supplementing or overriding the default widget
    props by key.

**Error Codes**: None

### FieldSetMany

A `FieldSetMany` is a simple case of a `FieldSetStackedInline` where there is only one field in the set. It is used to
render a field multiple times and provide interface to add and remove rows.

**JSON Type**: `Array`

**Type Coercion**: None

**Extra Props**:

-   `manyComponent` (`FieldComponent`): The field component to render for each item in the array

**Error Codes**: None

### FieldSetRange

A `FieldSetRange` represents a range between values.

**JSON Type**: `Array`

**Type Coercion**: None

**Extra Props**:

-   `boundaryComponent` (`FieldComponent`): The field component to render at the boundaries of the range

**Error Codes**: None

## Widgets

Widgets are the components that render the actual form inputs. They are injected with the field context and can use that
context to render the input and handle events. Widgets are responsible for rendering the input and handling events. They
are not responsible for validation or coercion of values. They emit `update:modelValue` events with the new value when
the value changes. This is to allow widgets to be used outside the context of a field. Widgets are responsible for
rendering their own labels. Typically, help text, errors and non-error messages are rendered by a form or fieldset
level. Independent use of widgets will need to do that themselves.

**Props**:
All widgets have the following props:

-   `name` (`String`): The name of the field, if not in a field context
-   `modelValue` (`Any`): The value of the field, if not in a field context
-   `label` (`String`): The label of the field, if not in a field context

**Emits**:
All widgets emit `update:modelValue` with the new value when the value changes.

### WidgetAutoComplete

A widget for auto-complete inputs. This is a wrapper for primevue `AutoComplete`. It is for selecting a objects for some
foreign key relationship.

**Extra Props**:

-   `app` (`String`): The app label to use for looking up options. This is required.
-   `model` (`String`): The model label to use for looking up options. This is required.
-   `modelFields` (`Array`): The fields to retrieve from the server. This is required.
-   `searchKey` (`String`): The key to use for searching in listArgs. The default is 's', our standard for search.

**Slots**:

-   `label`: Passed to `WidgetLabel`'s label slot, with the props `label` and `for`.

### WidgetCheckbox

A widget for a single boolean input. This is a wrapper for primevue `InputSwitch`.

**Extra Props**: None

**Slots**:

-   `label`: Passed to `WidgetLabel`'s label slot, with the props `label` and `for`.

### WidgetDatePicker

A widget for date input. This is a wrapper for primevue `Calendar`. It can actually be used for date, date-time and time
entry, via boolean attrs `showTime` and `timeOnly`.

**Extra Props**:

-   `selectionMode` (`String`): The selection mode for the calendar, default is `range` if our value is an array, `single`
    otherwise.

**Slots**:

-   `label`: Passed to `WidgetLabel`'s label slot, with the props `label` and `for`.

### WidgetDurationSeconds

A widget for editing duration, when the value is a number in seconds.

### WidgetFile

A widget for file uploads.

### WidgetGenericAutoComplete

A widget for picking generic objects. The user selects the app/model then selects the object.

### WidgetHTML

A widget for wysiwyg HTML input. This is a wrapper for tiptap's vue 3 editor.

**Extra Props**:

-   `disabled` (`Boolean`): Whether the input is disabled, default is `false`.
-   `menuComponent` (`Component`): The component to render for the menu, default is `MenuBar` from `@tiptap/vue-3`.
-   `extensions` (`Array`): The extensions to use for the editor. The default has unordered lists, ordered lists,
    headings and text alignment.

**Slots**:

-   `label`: Passed to `WidgetLabel`'s label slot, with the props `label` and `for`.

### WidgetIP

A widget for IP address input.

### WidgetImage

A widget allowing for the upload of images.

### WidgetInput

A widget for text input. This is a wrapper for primevue `InputText`, `InputOtp` and `InputMask` based on the type of
prop.

**Extra Props**:

-   `type` (`String`): The type of input, default is `text`.

### WidgetJSON

A widget for user facing JSON input. This is a wrapper for `InputTextarea` with a JSON formatter and validator.

**Extra Props**:

-   `pretty` (`Boolean`): Whether to pretty print the JSON, default is `true`.

### WidgetMultiSelect

A widget for multi-select inputs. This is a wrapper for primevue `MultiSelect`.

**Extra Props**:

-   `options` (`Array`): The options for the multi-select input.

**Slots**:

-   `label`: Passed to `WidgetLabel`'s label slot, with the props `label` and `for`.

### WidgetRadio

A widget for a radio group. Each radio button is rendered as a `RadioButton` from primevue.

**Extra Props**:

-   `options` (`Array`): The options for the radio group.
-   `optionLabel` (`String`): The key to use as the label for each option.
-   `optionValue` (`String`): The key to use as the value for each option.
-   `onFocus` (`Function`): A function to call when the input is focused.

**Slots**:

-   `radio(${fieldName})` - a slot for replacing the radio button component. The slot props are as follows:
    -   `class` (`String`): The class that would be provided from the theme to the radio button component.
    -   `id` (`String`): The id to place on the input element, for `for` attributes on labels.
    -   `input-name` (`String`): The name of the input element. renamed to avoid conflict with the slot name.
    -   `model-value` (`Any`): The selected value of the radio button.
    -   `onUpdate:model-value` (`Function`): The function to call when the radio button is selected.
    -   `value` (`Any`): The value of the radio button.
-   `label(${fieldName})` - a slot for replacing the label component. The slot props are as follows:
    -   `class` (`String`): The class that would be provided from the theme to the label component.
    -   `for` (`String`): The id of the input element that the label is for.
    -   `label` (`String`): The label for the radio button.

### WidgetReadOnly

A widget for read-only values on a form. The values is simply displayed as text.

**Extra Props**: None

**Slots**:

-   `label`: Labels the value, with the prop `label`.
-   `default`: Displays the value, with the props `value`.

### WidgetSelect

A widget for select inputs. This is a wrapper for primevue `Dropdown`.

**Extra Props**:

-   `options` (`Array`): The options for the select input.

**Slots**:

-   `label`: Passed to `WidgetLabel`'s label slot, with the props `label` and `for`.

### WidgetSlider

A widget for slider inputs. This is a wrapper for primevue `Slider`.

**Extra Props**:

-   `minValue` (`Number`): The minimum value for the slider.
-   `maxValue` (`Number`): The maximum value for the slider.

**Slots**:

-   `label`: Passed to `WidgetLabel`'s label slot, with the props `label` and `for`.

### WidgetTag

A multi-select widget for tags. It allows for adding existing tags or creating new tags.

**Extra Props**: ???

**Slots**:

-   `label`: Passed to `WidgetLabel`'s label slot, with the props `label` and `for`.

### WidgetTextarea

A widget for text area inputs. This is a wrapper for primevue `TextArea`.

**Extra Props**: None

**Slots**:

-   `label`: Passed to `WidgetLabel`'s label slot, with the props `label` and `for`.

### WidgetTriStateCheckbox

A widget for a tri-state checkbox. This is a wrapper for primevue `TriStateCheckbox`.

**Extra Props**: ???

**Slots**:

-   `label`: Passed to `WidgetLabel`'s label slot, with the props `label` and `for`.
