---
title: Buttons
status: brainstorming
audience: implementor
type: reference
---

<script setup>
import Button from "@vueda/controls/button/Button.vue";
import ButtonGroup from "@vueda/controls/button-group/ButtonGroup.vue";
import ButtonGroupSeparator from "@vueda/controls/button-group/ButtonGroupSeparator.vue";
import ButtonGroupText from "@vueda/controls/button-group/ButtonGroupText.vue";
import Switch from "@vueda/controls/switch/Switch.vue";
import Toggle from "@vueda/controls/toggle/Toggle.vue";
import ToggleGroup from "@vueda/controls/toggle-group/ToggleGroup.vue";
import ToggleGroupItem from "@vueda/controls/toggle-group/ToggleGroupItem.vue";
import Kbd from "@vueda/display/kbd/Kbd.vue";
import KbdGroup from "@vueda/display/kbd/KbdGroup.vue";
</script>

# Buttons

The button family covers every clickable affordance in vueda: primary buttons,
button groups, toggles, switches, and the keyboard caps that pair with them.
All variants share the same control sizing (32 / 28 / 40) and focus treatment
(2 px solid `--ring` outline at 2 px offset).

## Button — variants × sizes

<div class="not-prose flex flex-col gap-6">
  <div class="flex flex-wrap items-center gap-2">
    <Button size="sm" variant="default">Save</Button>
    <Button size="sm" variant="secondary">Save</Button>
    <Button size="sm" variant="outline">Save</Button>
    <Button size="sm" variant="ghost">Save</Button>
    <Button size="sm" variant="destructive">Delete</Button>
    <Button size="sm" variant="link">Learn more</Button>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <Button variant="default">Save</Button>
    <Button variant="secondary">Save</Button>
    <Button variant="outline">Save</Button>
    <Button variant="ghost">Save</Button>
    <Button variant="destructive">Delete</Button>
    <Button variant="link">Learn more</Button>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <Button size="lg" variant="default">Save</Button>
    <Button size="lg" variant="secondary">Save</Button>
    <Button size="lg" variant="outline">Save</Button>
    <Button size="lg" variant="ghost">Save</Button>
    <Button size="lg" variant="destructive">Delete</Button>
    <Button size="lg" variant="link">Learn more</Button>
  </div>
</div>

## Disabled

<div class="not-prose flex flex-wrap items-center gap-2">
  <Button disabled>Default</Button>
  <Button variant="secondary" disabled>Secondary</Button>
  <Button variant="outline" disabled>Outline</Button>
  <Button variant="destructive" disabled>Destructive</Button>
</div>

## Icon-only sizes

<div class="not-prose flex flex-wrap items-center gap-2">
  <Button size="icon-sm" variant="outline" aria-label="Settings">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  </Button>
  <Button size="icon" variant="outline" aria-label="Settings">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  </Button>
  <Button size="icon-lg" variant="outline" aria-label="Settings">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  </Button>
</div>

## ButtonGroup

Horizontal, vertical, with a text label, and with a separator.

<div class="not-prose flex flex-col gap-6">
  <ButtonGroup>
    <Button variant="outline">Bold</Button>
    <Button variant="outline">Italic</Button>
    <Button variant="outline">Underline</Button>
  </ButtonGroup>
  <ButtonGroup>
    <Button variant="secondary">Day</Button>
    <Button variant="secondary">Week</Button>
    <Button variant="secondary">Month</Button>
  </ButtonGroup>
  <ButtonGroup orientation="vertical">
    <Button variant="outline">North</Button>
    <Button variant="outline">East</Button>
    <Button variant="outline">South</Button>
    <Button variant="outline">West</Button>
  </ButtonGroup>
  <ButtonGroup>
    <ButtonGroupText>https://</ButtonGroupText>
    <Button variant="outline">Copy</Button>
  </ButtonGroup>
  <ButtonGroup>
    <Button variant="outline">Save</Button>
    <ButtonGroupSeparator />
    <Button variant="outline">Save as…</Button>
  </ButtonGroup>
</div>

## Toggle

<div class="not-prose flex flex-col gap-6">
  <div class="flex flex-wrap items-center gap-2">
    <Toggle size="sm" default-pressed>B</Toggle>
    <Toggle size="sm">I</Toggle>
    <Toggle size="sm">U</Toggle>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <Toggle default-pressed>Bold</Toggle>
    <Toggle>Italic</Toggle>
    <Toggle>Underline</Toggle>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <Toggle variant="outline" default-pressed>Bold</Toggle>
    <Toggle variant="outline">Italic</Toggle>
    <Toggle variant="outline">Underline</Toggle>
  </div>
</div>

## ToggleGroup

Default spacing (single selection):

<div class="not-prose">
  <ToggleGroup type="single" default-value="left">
    <ToggleGroupItem value="left">Left</ToggleGroupItem>
    <ToggleGroupItem value="center">Center</ToggleGroupItem>
    <ToggleGroupItem value="right">Right</ToggleGroupItem>
  </ToggleGroup>
</div>

Joined (`spacing="0"`, `variant="outline"`):

<div class="not-prose">
  <ToggleGroup type="single" variant="outline" spacing="0" default-value="day">
    <ToggleGroupItem value="day">Day</ToggleGroupItem>
    <ToggleGroupItem value="week">Week</ToggleGroupItem>
    <ToggleGroupItem value="month">Month</ToggleGroupItem>
  </ToggleGroup>
</div>

Multiple selection:

<div class="not-prose">
  <ToggleGroup type="multiple" :default-value="['bold', 'italic']">
    <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
    <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
    <ToggleGroupItem value="underline">Underline</ToggleGroupItem>
  </ToggleGroup>
</div>

## Switch

<div class="not-prose flex flex-wrap items-center gap-6">
  <label class="inline-flex items-center gap-2 text-sm">
    <Switch />
    <span>Off</span>
  </label>
  <label class="inline-flex items-center gap-2 text-sm">
    <Switch default-checked />
    <span>On</span>
  </label>
  <label class="inline-flex items-center gap-2 text-sm opacity-50">
    <Switch disabled />
    <span>Disabled</span>
  </label>
  <label class="inline-flex items-center gap-2 text-sm opacity-50">
    <Switch default-checked disabled />
    <span>Disabled · on</span>
  </label>
</div>

## Kbd

Single keycaps and grouped shortcuts.

<div class="not-prose flex flex-col gap-4">
  <div class="flex flex-wrap items-center gap-2">
    <Kbd>⌘</Kbd>
    <Kbd>K</Kbd>
    <Kbd>⇧</Kbd>
    <Kbd>⌫</Kbd>
    <Kbd>Esc</Kbd>
  </div>
  <KbdGroup>
    <Kbd>⌘</Kbd>
    <Kbd>K</Kbd>
  </KbdGroup>
  <div class="flex items-center gap-2">
    <Button variant="outline">
      Search
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </Button>
  </div>
</div>
