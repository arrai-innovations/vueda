---
title: Date + Time
status: brainstorming
audience: designer
type: reference
---

<script setup>
import { CalendarDate, Time } from "@internationalized/date";
import DateField from "@vueda/controls/date-field/DateField.vue";
import DateFieldInput from "@vueda/controls/date-field/DateFieldInput.vue";
import DateRangeField from "@vueda/controls/date-range-field/DateRangeField.vue";
import DateRangeFieldInput from "@vueda/controls/date-range-field/DateRangeFieldInput.vue";
import TimeField from "@vueda/controls/time-field/TimeField.vue";
import TimeFieldInput from "@vueda/controls/time-field/TimeFieldInput.vue";
import Calendar from "@vueda/controls/calendar/Calendar.vue";
import RangeCalendar from "@vueda/controls/range-calendar/RangeCalendar.vue";

const dateValue = new CalendarDate(2026, 5, 10);
const placeholderMay = new CalendarDate(2026, 5, 1);
const placeholderApr = new CalendarDate(2026, 4, 1);
const calendarSelected = new CalendarDate(2026, 5, 14);
const rangeValue = { start: new CalendarDate(2026, 4, 10), end: new CalendarDate(2026, 4, 24) };
const timeValue = new Time(14, 30);
const timeValueSec = new Time(9, 45, 22);
const isDateUnavailable = (date) => [8, 15, 22].includes(date.day);
const isDateDisabled = (date) => date.day < 5;
</script>

# Date + Time

The date and time family covers segment-based text entry for dates, date
ranges, and times, plus the standalone calendar pickers. All three
field types share the same container chrome as regular inputs: a
`hairline` border, `bg-transparent` fill, and `focus-within:hairline-ring`
on the container when any segment is active. Individual segments highlight
with {@api css-token:accent} on focus. Calendars carry their own visual
budget: a `p-3` root, `--vueda-cal-day` for cell sizing, and
{@api css-token:primary} for selected cells.

This page is the visual contract the default theme guarantees. Because the
focus ring on segment fields is triggered by real keyboard focus inside the
container rather than by a `focus-visible` pseudo-class, it cannot be
simulated by the docs harness. Click into any segment below to see the
accent highlight and container ring live.

For the mechanics of overriding any of this, see
[Customize VUEDA Appearance](../../guides/customize-vueda-appearance.md).

## DateField: composition matrix

DateField is a segment-based date input. The default slot exposes
`{ segments }` — an array of objects each with `part` and `value`.
Pass `part` to `DateFieldInput` for each segment; Reka renders literal
separators (slashes) as non-interactive spans automatically.

Theme keys: {@api theme-key:DateField}, {@api theme-key:DateFieldInput}.
Token surface: {@api css-token:border} (container border),
{@api css-token:ring} (focus ring), {@api css-token:accent} (active
segment fill), {@api css-token:muted} (read-only fill).

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      date-only (default)
    </header>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">empty</div>
      <DateField>
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">filled</div>
      <DateField :default-value="dateValue">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">container border <code>--border</code></span>
      <span class="whitespace-nowrap">placeholder text <code>--muted-foreground</code></span>
      <span class="whitespace-nowrap">click a segment to see focus ring</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      datetime (granularity="minute")
    </header>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">empty</div>
      <DateField granularity="minute">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">with seconds</div>
      <DateField granularity="second">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">granularity controls which segments appear</span>
      <span class="whitespace-nowrap">accepts "day" | "hour" | "minute" | "second"</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      read modes
    </header>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">readonly</div>
      <DateField :default-value="dateValue" readonly>
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">disabled</div>
      <DateField :default-value="dateValue" disabled>
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
          </template>
        </template>
      </DateField>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">readonly fill <code>--muted</code>/50</span>
      <span class="whitespace-nowrap">disabled opacity 50</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      invalid
    </header>
    <DateField aria-invalid="true">
      <template #default="{ segments }">
        <template v-for="item in segments" :key="item.part">
          <DateFieldInput :part="item.part">{{ item.value }}</DateFieldInput>
        </template>
      </template>
    </DateField>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">border <code>--destructive</code></span>
    </footer>
  </section>
</div>

## DateRangeField: composition matrix

DateRangeField extends the segment pattern to a start–end pair. The
default slot exposes `{ segments }` as `{ start: [...], end: [...] }`.
Iterate each array with `DateRangeFieldInput`, passing `type="start"` or
`type="end"` alongside `part`. A visual separator between the two halves
is the consumer's responsibility and typically rendered as a plain
`<span>`.

Theme keys: {@api theme-key:DateRangeField},
{@api theme-key:DateRangeFieldInput}. Token surface mirrors DateField.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      default
    </header>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">empty</div>
      <DateRangeField>
        <template #default="{ segments }">
          <template v-for="item in segments.start" :key="`s-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="start">{{ item.value }}</DateRangeFieldInput>
          </template>
          <span class="text-muted-foreground px-1" aria-hidden="true">&ndash;</span>
          <template v-for="item in segments.end" :key="`e-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="end">{{ item.value }}</DateRangeFieldInput>
          </template>
        </template>
      </DateRangeField>
    </div>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">filled</div>
      <DateRangeField :default-value="rangeValue">
        <template #default="{ segments }">
          <template v-for="item in segments.start" :key="`s-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="start">{{ item.value }}</DateRangeFieldInput>
          </template>
          <span class="text-muted-foreground px-1" aria-hidden="true">&ndash;</span>
          <template v-for="item in segments.end" :key="`e-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="end">{{ item.value }}</DateRangeFieldInput>
          </template>
        </template>
      </DateRangeField>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">start and end share the same container chrome</span>
      <span class="whitespace-nowrap">separator is consumer markup</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      read modes
    </header>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">readonly</div>
      <DateRangeField :default-value="rangeValue" readonly>
        <template #default="{ segments }">
          <template v-for="item in segments.start" :key="`s-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="start">{{ item.value }}</DateRangeFieldInput>
          </template>
          <span class="text-muted-foreground px-1" aria-hidden="true">&ndash;</span>
          <template v-for="item in segments.end" :key="`e-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="end">{{ item.value }}</DateRangeFieldInput>
          </template>
        </template>
      </DateRangeField>
    </div>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">disabled</div>
      <DateRangeField :default-value="rangeValue" disabled>
        <template #default="{ segments }">
          <template v-for="item in segments.start" :key="`s-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="start">{{ item.value }}</DateRangeFieldInput>
          </template>
          <span class="text-muted-foreground px-1" aria-hidden="true">&ndash;</span>
          <template v-for="item in segments.end" :key="`e-${item.part}`">
            <DateRangeFieldInput :part="item.part" type="end">{{ item.value }}</DateRangeFieldInput>
          </template>
        </template>
      </DateRangeField>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">readonly fill <code>--muted</code>/50</span>
      <span class="whitespace-nowrap">disabled opacity 50</span>
    </footer>
  </section>
</div>

## TimeField: composition matrix

TimeField renders hour, minute, and optional second segments plus an
AM/PM period segment when `hourCycle` is 12. The slot API is identical to
DateField: `{ segments }` as a flat array, iterated with `TimeFieldInput`.

Theme keys: {@api theme-key:TimeField}, {@api theme-key:TimeFieldInput}.
Token surface mirrors DateField.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      24-hour
    </header>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">empty (hour:minute)</div>
      <TimeField :hour-cycle="24">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <TimeFieldInput :part="item.part">{{ item.value }}</TimeFieldInput>
          </template>
        </template>
      </TimeField>
    </div>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">with seconds</div>
      <TimeField :hour-cycle="24" granularity="second" :default-value="timeValueSec">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <TimeFieldInput :part="item.part">{{ item.value }}</TimeFieldInput>
          </template>
        </template>
      </TimeField>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">granularity controls which segments appear</span>
      <span class="whitespace-nowrap">colons are literal segments</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      12-hour
    </header>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">empty</div>
      <TimeField :hour-cycle="12">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <TimeFieldInput :part="item.part">{{ item.value }}</TimeFieldInput>
          </template>
        </template>
      </TimeField>
    </div>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">filled</div>
      <TimeField :hour-cycle="12" :default-value="timeValue">
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <TimeFieldInput :part="item.part">{{ item.value }}</TimeFieldInput>
          </template>
        </template>
      </TimeField>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">AM/PM segment appended when hourCycle=12</span>
      <span class="whitespace-nowrap">segment bg <code>--accent</code> on focus</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      read modes
    </header>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">readonly</div>
      <TimeField :default-value="timeValue" :hour-cycle="24" readonly>
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <TimeFieldInput :part="item.part">{{ item.value }}</TimeFieldInput>
          </template>
        </template>
      </TimeField>
    </div>
    <div class="flex flex-col gap-1">
      <div class="text-[10px] uppercase tracking-wide text-muted-foreground">disabled</div>
      <TimeField :default-value="timeValue" :hour-cycle="24" disabled>
        <template #default="{ segments }">
          <template v-for="item in segments" :key="item.part">
            <TimeFieldInput :part="item.part">{{ item.value }}</TimeFieldInput>
          </template>
        </template>
      </TimeField>
    </div>
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">readonly fill <code>--muted</code>/50</span>
      <span class="whitespace-nowrap">disabled opacity 50</span>
    </footer>
  </section>
</div>

## Calendar: state matrix

Calendar is a fully self-contained composite: it renders the header,
nav buttons, weekday row, and date grid internally. Consumers mount it
directly with `v-model` or `default-value`. The `layout` prop switches
the heading between a static text label, a month dropdown, a year
dropdown, or the combined month-and-year dropdowns.

Theme keys: {@api theme-key:Calendar}, {@api theme-key:CalendarCell},
{@api theme-key:CalendarCellTrigger}. Token surface:
{@api css-token:accent} (today highlight, range fill),
{@api css-token:primary} (selected cell),
{@api css-token:muted-foreground} (outside-month and disabled cells),
{@api css-token:destructive} (unavailable cells).

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      default (today highlighted)
    </header>
    <Calendar :default-placeholder="placeholderMay" />
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">today bg <code>--accent</code></span>
      <span class="whitespace-nowrap">no selection</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      with selected date
    </header>
    <Calendar :default-value="calendarSelected" :default-placeholder="placeholderMay" />
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">selected bg <code>--primary</code></span>
      <span class="whitespace-nowrap">selected fg <code>--primary-foreground</code></span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      month-and-year layout
    </header>
    <Calendar layout="month-and-year" :default-placeholder="placeholderMay" />
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">layout="month-and-year" replaces static heading with dropdowns</span>
      <span class="whitespace-nowrap">also accepts "month-only" and "year-only"</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      unavailable dates
    </header>
    <Calendar :default-placeholder="placeholderMay" :is-date-unavailable="isDateUnavailable" />
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">unavailable fg <code>--destructive-foreground</code></span>
      <span class="whitespace-nowrap">unavailable text line-through</span>
      <span class="whitespace-nowrap">days 8, 15, 22 marked unavailable in this demo</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      disabled dates
    </header>
    <Calendar :default-placeholder="placeholderMay" :is-date-disabled="isDateDisabled" />
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">disabled cells opacity 50</span>
      <span class="whitespace-nowrap">days before the 5th disabled in this demo</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      disabled calendar
    </header>
    <Calendar :default-placeholder="placeholderMay" disabled />
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">entire calendar at opacity 50</span>
      <span class="whitespace-nowrap">nav buttons and cells not interactive</span>
    </footer>
  </section>
</div>

## RangeCalendar: state matrix

RangeCalendar renders a date range picker. The selected range fills
with {@api css-token:accent} between start and end; the two endpoint
cells use {@api css-token:primary}. The `RangeCalendarCell` CSS handles
the rounded-corner transitions at the selection boundaries.

Theme keys: {@api theme-key:RangeCalendar}, {@api theme-key:RangeCalendarCell},
{@api theme-key:RangeCalendarCellTrigger}. Token surface mirrors Calendar.

<div class="not-prose grid gap-6 sm:grid-cols-2">
  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      with range (Apr 10 – Apr 24)
    </header>
    <RangeCalendar :default-value="rangeValue" :default-placeholder="placeholderApr" />
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">range fill <code>--accent</code></span>
      <span class="whitespace-nowrap">endpoints bg <code>--primary</code></span>
      <span class="whitespace-nowrap">rounded corners at selection-start and selection-end</span>
    </footer>
  </section>

  <section class="flex flex-col gap-3 rounded-vueda-card border border-border p-4">
    <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      default (empty, today highlighted)
    </header>
    <RangeCalendar :default-placeholder="placeholderMay" />
    <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span class="whitespace-nowrap">today bg <code>--accent</code></span>
      <span class="whitespace-nowrap">click to start a selection</span>
    </footer>
  </section>
</div>
