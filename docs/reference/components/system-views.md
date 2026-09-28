---
title: System Views
status: draft
audience: designer
type: reference
---

<script setup>
import { ref } from "vue";
import ViewLoading from "@vueda/views/ViewLoading.vue";
import PageTitle from "@vueda/shell/page-title/PageTitle.vue";
import ConsequencesBullets from "@vueda/display/consequences-bullets/ConsequencesBullets.vue";
import SystemMessageCard from "@vueda/display/system-message/SystemMessageCard.vue";
import TypedConfirmField from "@vueda/form/confirm/TypedConfirmField.vue";
import TriedUrlCallout from "@vueda/display/system-message/TriedUrlCallout.vue";
import DiagnosticStrip from "@vueda/display/system-message/DiagnosticStrip.vue";
import SuggestionList from "@vueda/display/system-message/SuggestionList.vue";
import ErrorDisplay from "@vueda/display/error-display/ErrorDisplay.vue";
import Button from "@vueda/controls/button/Button.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faHouse, faSearch } from "@fortawesome/free-solid-svg-icons";

const usernameConfirm = ref("");
const destroyConfirm = ref("");

// Fixtures for the ViewNotFound and ViewActionNotFound compositions below. They mirror what
// each view passes to SuggestionList and DiagnosticStrip for the tried path in its demo.
const notFoundSuggestions = [
  { label: "/admin/customers/:pk/edit", score: 0.87, to: "/admin/customers/99999/edit" },
  { label: "/admin/customers/:pk", score: 0.74, to: "/admin/customers/99999" },
];
const notFoundDiagnostics = [{ label: "route", value: "/admin/custmrs/99999/edit" }];
const actionNotFoundSuggestions = [
  { label: "archive", sub: "/crm/customer/archive", to: "/crm/customer/archive" },
  { label: "create", sub: "/crm/customer/create", to: "/crm/customer/create" },
  { label: "list", sub: "/crm/customer/list", to: "/crm/customer/list" },
];
const actionNotFoundDiagnostics = [{ label: "route", value: "/crm/customer/archve/" }];

// Fixtures for the SuggestionList, DiagnosticStrip, and ErrorDisplay demos below.
// All values are fictional. Emails use domain.invalid per the test conventions.
const routeSuggestions = [
  { label: "customers", sub: "/customers", score: 0.92, to: "/customers" },
  { label: "customer-groups", sub: "/customer-groups", score: 0.71, to: "/customer-groups" },
  { label: "custom-fields", sub: "/settings/custom-fields", score: 0.54, to: "/settings/custom-fields" },
];
const actionSuggestions = [
  { label: "archive", sub: "Move out of the active list", verb: "POST", to: "/customers/archive" },
  { label: "retrieve", sub: "Read one customer", verb: "GET", to: "/customers/9" },
  { label: "destroy", sub: "Delete permanently", verb: "DELETE", to: "/customers/9/destroy" },
];
const diagnosticRows = [
  { label: "request id", value: "req_01HZXQ4M7T" },
  { label: "route", value: "/customers/9/edit" },
  { label: "session", value: "sess_8f2ad41c" },
];
const diagnosticProseRows = [
  { label: "what happened", value: "The record was locked by another editor." },
  { label: "who to ask", value: "support@domain.invalid" },
];

// A plain object rather than an Error instance: the formatter includes a stack trace in
// development builds, which would make these cards differ between the dev server and the
// published site. Shaped like the FetchError the server layer raises.
const conflictError = {
  name: "FetchError",
  message: "Request failed.",
  response: { status: 409, statusText: "Conflict" },
  responseData: { detail: "Customer 9 is locked by another editor until 14:05." },
};
const batchErrors = [
  conflictError,
  { name: "FetchError", message: "Request failed.", response: { status: 422, statusText: "Unprocessable Content" }, responseData: { detail: "Row 14 has no matching ledger account." } },
];
</script>

# System Views

This page shows the views VUEDA renders while a route loads, when a route or model action does not exist, and when a user deactivates records. It also shows the display parts those views and the other action views build on. [Components](./index.md) describes the rules every component page shares.

## ViewLoading

{@api vue:component:ViewLoading} is the route-level loading status. {@api vue:component:ViewActionRouter} shows it while a route's model config and workflow load. By default it shows a loading icon and a label.

After [`slowAfterMs`]{@api vue:component:ViewLoading:prop:slowAfterMs}, it switches to an hourglass icon and a message saying the load is taking longer than usual. The prop defaults to the {@api css-token:vueda-loading-slow-ms} token. The [`slow-actions`]{@api vue:component:ViewLoading:slot:slow-actions} slot adds buttons once the load is slow. Context text, request details, and dependency progress appear only when the caller passes them.

The `loading` and `hourglass` icons come from the `ViewLoading` entry of the {@term Icon Registry}, falling back to its `Default` entry.

These previews hold the normal and slow states so both stay visible.

Theme keys: {@api theme-key:ViewLoading}.

<VuedaDemo class="grid gap-4 md:grid-cols-2">
  <section>
    <h3 class="text-sm font-medium">Loading</h3>
    <ViewLoading :slow-after-ms="Infinity" />
  </section>
  <section>
    <h3 class="text-sm font-medium">Slow load</h3>
    <ViewLoading :slow-after-ms="0" />
  </section>
</VuedaDemo>

## ViewNotFound

{@api vue:component:ViewNotFound} is the route-level 404 page. It is a [SystemMessageCard](#systemmessagecard) in the `info` tone, with these parts from top to bottom:

- a crest with the "Route not found" eyebrow, the typed path, and a `404` code;
- a short explanation, which the [`blurb`]{@api vue:component:ViewNotFound:slot:blurb} slot replaces;
- a [TriedUrlCallout](#triedurlcallout) that marks the segments of the typed path that differ from the closest route;
- a [SuggestionList](#suggestionlist) of the closest routes, each with its similarity score;
- a [DiagnosticStrip](#diagnosticstrip) with the route, followed by any rows in the [`diagnostics`]{@api vue:component:ViewNotFound:prop:diagnostics} prop;
- Back and Go to home buttons, which the [`actions`]{@api vue:component:ViewNotFound:slot:actions} slot replaces.

{@api js:function:@arrai-innovations/vueda/use/useSuggestRoute#useSuggestRoutes} scores every registered route path against the typed path by string similarity, with each numeric segment read as a primary key. It keeps up to [`suggestionLimit`]{@api vue:component:ViewNotFound:prop:suggestionLimit} routes, five by default, and drops routes that score zero. The list is hidden when no route scores.

The callout compares each typed segment with the same position in the top suggestion. A numeric segment matches a route parameter. With no suggestion, every segment is marked. Go to home opens [`homePath`]{@api vue:component:ViewNotFound:prop:homePath}, `/` by default.

This page has no router, so the demo below composes the same parts the view renders for a mistyped path.

Theme keys: {@api theme-key:ViewNotFound}.

<VuedaDemo class="flex flex-col gap-5">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ViewNotFound: composed output (404 crest, tried path, suggestions, diagnostics)</header>
  <div class="flex justify-center">
    <SystemMessageCard tone="info" icon-name="notFound">
      <template #crest-eyebrow>Route not found</template>
      <template #crest-kind>/admin/custmrs/99999/edit</template>
      <template #crest-code>404</template>
      <p class="text-[13px] leading-[1.5] text-muted-foreground">No registered route matched this path. The closest matches in the router are listed below.</p>
      <TriedUrlCallout
        label="You tried"
        :segments="[
          { text: '/admin' },
          { text: '/custmrs', bad: true },
          { text: '/99999' },
          { text: '/edit' },
        ]"
      />
      <SuggestionList head="Did you mean" source="router.suggest()" shape="route" :items="notFoundSuggestions" />
      <DiagnosticStrip :rows="notFoundDiagnostics" />
      <template #actions>
        <Button size="sm" emphasis="ghost">Back</Button>
        <Button size="sm" tone="primary" class="ml-auto">Go to home</Button>
      </template>
    </SystemMessageCard>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>tried path: <code>/99999</code> matches the <code>:pk</code> parameter of the top suggestion, so only <code>/custmrs</code> is marked</span>
    <span>diagnostics: the route row comes first; the <code>diagnostics</code> prop appends rows such as a request id</span>
  </footer>
</VuedaDemo>

## ViewActionNotFound

{@api vue:component:ViewActionNotFound} is the 404 page for a model action. {@api vue:component:ViewActionRouter} shows it when no view resolves for the route ({@term Action View Resolution}). It has the same parts as [ViewNotFound](#viewnotfound), with these differences:

- The crest shows the `app/model/action` key.
- The callout is labelled "Action key", and only its action segment is marked.
- The suggestion list shows the closest model's actions.
- The second button is Browse all actions, which opens that model's list route. It is hidden when no model is close.

The suggestions come from the {@term Model Info} the client has already loaded. The view picks the closest app label by string similarity, then the closest model in that app. It lists that model's actions by route name, so `retrieve` appears as `read`. It leaves out `partial_update`, which the `update` route serves. A detail action appears only when the tried route has a primary key, and its link reuses that key. The list is sorted by similarity to the tried action name. The view passes no HTTP verb, so the rows show no verb chip.

This demo composes the same parts for a mistyped action on a model whose actions are `list`, `create`, and `archive`.

Theme keys: {@api theme-key:ViewActionNotFound}.

<VuedaDemo class="flex flex-col gap-5">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ViewActionNotFound: composed output (404 crest, action key, available actions, diagnostics)</header>
  <div class="flex justify-center">
    <SystemMessageCard tone="info" icon-name="actionNotFound">
      <template #crest-eyebrow>Action not found</template>
      <template #crest-kind>crm/customer/archve</template>
      <template #crest-code>404</template>
      <p class="text-[13px] leading-[1.5] text-muted-foreground">No such action is registered for this model. The model's available actions are listed below.</p>
      <TriedUrlCallout
        label="Action key"
        :segments="[
          { text: 'crm' },
          { text: '/' },
          { text: 'customer' },
          { text: '/' },
          { text: 'archve', bad: true },
        ]"
      />
      <SuggestionList head="Available actions" source="crm.customer · 3" shape="action" :items="actionNotFoundSuggestions" />
      <DiagnosticStrip :rows="actionNotFoundDiagnostics" />
      <template #actions>
        <Button size="sm" emphasis="ghost">Back</Button>
        <Button size="sm" tone="primary" class="ml-auto">Browse all actions</Button>
      </template>
    </SystemMessageCard>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>callout: only the action segment is marked; the app and model show as typed</span>
    <span>browse: opens <code>/crm/customer/list</code>, the closest model's list route</span>
  </footer>
</VuedaDemo>

## ViewDeactivate

{@api vue:component:ViewDeactivate} is the default view for every model's `deactivate` route. It renders the same confirmation as {@api vue:component:ViewActivate}, which [Action & Workflow Views](./action-workflow.md#viewactivate) shows live. The title reads "Deactivate {Model}" unless you set the [`title`]{@api vue:component:ViewDeactivate:prop:title} prop. The card uses the `warning` [tone]{@api vue:component:ModelActionForm:prop:tone}.

The confirmation is a {@api vue:component:ModelActionForm}. It lists the selected objects and sends a {@term Dry Run} of the `deactivate` action when it opens. On confirm, it sends the action as a `PATCH` request. If the server answers with warnings, the form asks the user to confirm them ({@term Warning Confirmation}) before it resends. After success or cancel, the form opens the {@term Action Redirect}. The view puts its title in the page title and a Go Back button in the page actions.

Attributes and slots pass through to `ModelActionForm`, so a page that wraps `ViewDeactivate` can change its copy and add a typed confirmation.

Theme keys: {@api theme-key:ViewDeactivate} for the outer wrapper, and {@api theme-key:ModelActionForm} for the card.

### Self-service account page

A page that lets a signed-in user deactivate their own account can wrap `ViewDeactivate`. This example targets the signed-in user and asks them to type their email address. It also replaces the default prompt with account copy:

```vue
<script setup>
import { storeUser } from "@vueda/stores/storeUser.js";
import ViewDeactivate from "@vueda/views/ViewDeactivate.vue";

const userStore = storeUser();
</script>

<template>
    <ViewDeactivate
        app="accounts"
        model="user"
        :pk="String(userStore.loggedInUser.id)"
        :confirm-text="userStore.loggedInUser.email"
        banner-title="Deactivate your account"
        action-success-summary="Account deactivated"
    >
        <template #confirm-message>
            <p>Deactivate your account? Type your email address below to confirm.</p>
        </template>
    </ViewDeactivate>
</template>
```

- Replace `accounts` and `user` with your user model's app label and model name.
- [`confirmText`]{@api vue:component:ModelActionForm:prop:confirmText} adds a [TypedConfirmField](#typedconfirmfield), and the confirm button stays disabled until the typed value matches.
- [`bannerTitle`]{@api vue:component:ModelActionForm:prop:bannerTitle} and [`actionSuccessSummary`]{@api vue:component:ModelActionForm:prop:actionSuccessSummary} replace the banner title and the success toast. By default both combine the action and model names.
- The [`confirm-message`]{@api vue:component:ModelActionForm:slot:confirm-message} slot replaces the default prompt.

The prompt only describes the action. The server's `deactivate` action decides what deactivating the account changes.

## SystemMessageCard

{@api vue:component:SystemMessageCard} is the card that [ViewNotFound](#viewnotfound) and [ViewActionNotFound](#viewactionnotfound) are built on. It has three parts:

- a crest: an icon tile tinted by the [`tone`]{@api vue:component:SystemMessageCard:prop:tone}, an eyebrow label, a monospace kind line, and an optional status code, above a divider;
- a body, from the default slot;
- an optional actions footer, from the `actions` slot.

The tones are `info`, `warning`, `danger`, and `loading`. The root carries `data-tone`, and the crest icon tile takes its tint from that attribute. The crest code and the actions footer render only when their slots have content.

Set [`icon-name`]{@api vue:component:SystemMessageCard:prop:iconName} to an {@term Icon Registry} name to show an icon in the tile. [`icon-props`]{@api vue:component:SystemMessageCard:prop:iconProps} adds attributes to that icon. [`iconOverride`]{@api vue:component:SystemMessageCard:prop:iconOverride} replaces registry entries for this card and its descendants.

Theme keys: {@api theme-key:SystemMessageCard}. {@api theme-key:SystemMessageCard.crestIcon} holds the tint for each tone.

<VuedaDemo class="flex flex-col gap-5">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SystemMessageCard: info tone (404 route not found)</header>
  <div class="flex justify-center">
    <SystemMessageCard tone="info" icon-name="notFound">
      <template #crest-eyebrow>route not found</template>
      <template #crest-kind>/admin/customers/99999/edit</template>
      <template #crest-code>404</template>
      <p class="text-[13px] leading-[1.5] text-muted-foreground">The path <code class="rounded border border-border bg-muted/40 px-1 font-mono text-[11px]">/admin/customers/99999/edit</code> does not match any registered route.</p>
      <template #actions>
        <Button size="sm" emphasis="outline">
          <FontAwesomeIcon :icon="faHouse" />
          Return to dashboard
        </Button>
        <Button size="sm" emphasis="ghost">
          <FontAwesomeIcon :icon="faSearch" />
          Did you mean /admin/customers/99999?
        </Button>
      </template>
    </SystemMessageCard>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>crest-code: optional; omit the slot and the code disappears</span>
    <span>actions slot: renders only when provided; omit it and the footer disappears</span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-5">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SystemMessageCard: warning tone, no crest code</header>
  <div class="flex justify-center">
    <SystemMessageCard tone="warning" icon-name="warning">
      <template #crest-eyebrow>import paused</template>
      <template #crest-kind>billing/invoice/import</template>
      <p class="text-[13px] leading-[1.5] text-muted-foreground">The import stopped at row 214 because the file changed while it ran. Upload the file again to continue.</p>
      <template #actions>
        <Button size="sm" emphasis="outline">Cancel</Button>
        <Button size="sm" tone="primary">Upload again</Button>
      </template>
    </SystemMessageCard>
  </div>
</VuedaDemo>

## ConsequencesBullets

{@api vue:component:ConsequencesBullets} is a list of what a destructive action will do. {@api vue:component:ViewDestroy} uses it to list the linked records a delete affects. Each row has an optional leading icon, a bold label, and an optional muted description.

A row's `tone` (`default`, `warn`, or `danger`) tints only its icon, through {@api theme-key:ConsequencesBullets.toneWarn} and {@api theme-key:ConsequencesBullets.toneDanger}. The list shows relative severity without overpowering the card around it.

Icons come from the `ConsequencesBullets` entry of the {@term Icon Registry}, falling back to its `Default` entry. When a name has no icon, the icon cell still renders, so labels stay aligned across rows.

Theme keys: {@api theme-key:ConsequencesBullets}.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ConsequencesBullets: four rows, three tones</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card p-4">
    <ConsequencesBullets
      :items="[
        { icon: 'shieldHalved', label: 'Sessions revoked', description: 'All sessions across devices end immediately.' },
        { icon: 'lifeRing', label: 'API tokens disabled', description: 'Personal access tokens stop authenticating.' },
        { icon: 'circle', label: 'Shared resources transfer', description: 'Owned records move to the team default owner.', tone: 'warn' },
        { icon: 'clock', label: 'After 30 days, irrecoverable', description: 'Account and history are purged.', tone: 'danger' },
      ]"
    />
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>row shape: <code>{ icon, label, description, tone }</code>; only <code>label</code> is required</span>
    <span>tone: each row carries <code>data-tone</code>; <code>warn</code> and <code>danger</code> tint the icon only</span>
  </footer>
</VuedaDemo>

## TypedConfirmField

{@api vue:component:TypedConfirmField} asks the user to type an exact value before a destructive button enables. {@api vue:component:ModelActionForm} renders one when its [`confirmText`]{@api vue:component:ModelActionForm:prop:confirmText} prop has a value. Any view built on it, such as {@api vue:component:ViewDestroy}, can require one.

The field is a muted box with a label, an inline monospace chip showing the expected value, and a monospace input. The input turns off autocomplete and spell check. The match is exact, including case and whitespace, and the root carries `data-match="true"` or `"false"`.

Read the match state from the [`match`]{@api vue:component:TypedConfirmField:event:match} event, or compare the `v-model` value with `expectedValue`. Disable your submit control until they match.

Theme keys: {@api theme-key:TypedConfirmField}.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TypedConfirmField: typed username</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card p-4">
    <TypedConfirmField
      v-model="usernameConfirm"
      expected-value="mara.tani"
      label-lead="Type your username"
      label-tail="to confirm"
    />
    <p class="mt-3 text-xs text-muted-foreground">
      typed: <code class="rounded border border-border bg-muted/40 px-1 font-mono text-[11px]">{{ usernameConfirm || "(empty)" }}</code>
      · match: <code class="rounded border border-border bg-muted/40 px-1 font-mono text-[11px]">{{ usernameConfirm === "mara.tani" ? "true" : "false" }}</code>
    </p>
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>label: <code>labelLead</code>, then the <code>expectedValue</code> chip, then <code>labelTail</code></span>
  </footer>
</VuedaDemo>

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TypedConfirmField: multi-record destroy phrase</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card p-4">
    <TypedConfirmField
      v-model="destroyConfirm"
      expected-value="delete 3 customers"
      label-lead="Type"
      label-tail="to permanently delete the selected records"
    />
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>placeholder defaults to <code>expectedValue</code>; set the <code>placeholder</code> prop when the phrase is too long to echo</span>
    <span>for custom label markup, use the <code>label</code> slot, which receives <code>expectedValue</code> and <code>chipClass</code></span>
  </footer>
</VuedaDemo>

## TriedUrlCallout

{@api vue:component:TriedUrlCallout} is a bordered callout that shows the path or action key the user tried, with the wrong segments marked. [ViewNotFound](#viewnotfound) and [ViewActionNotFound](#viewactionnotfound) place it above their suggestion lists.

The callout has two columns: an uppercase label on the left and the monospace value on the right. The [`segments`]{@api vue:component:TriedUrlCallout:prop:segments} prop takes `{ text, bad? }` entries, and the caller splits the path. Segments with `bad: true` use the destructive text color. The other segments use {@api theme-key:TriedUrlCallout.fade}, so the marked segment stands out. The label defaults to "You tried".

Theme keys: {@api theme-key:TriedUrlCallout}.

<VuedaDemo class="flex flex-col gap-3">
  <header class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TriedUrlCallout: route path and action key</header>
  <div class="rounded-vueda-card hairline hairline-border bg-card p-4 flex flex-col gap-3">
    <TriedUrlCallout
      label="You tried"
      :segments="[
        { text: '/admin/' },
        { text: 'custommers', bad: true },
        { text: '/list' },
      ]"
    />
    <TriedUrlCallout
      label="Action key"
      :segments="[{ text: 'archve', bad: true }]"
    />
  </div>
  <footer class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
    <span>marked segment: always the destructive text color; the other segments take the <code>fade</code> theme slot</span>
    <span>segments: the caller splits the path and marks the wrong segment with <code>bad: true</code></span>
  </footer>
</VuedaDemo>

## SuggestionList

{@api vue:component:SuggestionList} is the "Did you mean" list the 404 views show. It takes a head label, an optional monospace source label, and a list of rows. Each row has an icon, a label with an optional second line, a trailing chip, and a chevron. The [`shape`]{@api vue:component:SuggestionList:prop:shape} decides what the chip shows: `route` shows a similarity score, and `action` shows an HTTP verb.

Each row is a `router-link`, so the rows navigate in an application with vue-router. This page has no router, so the rows below render the link a real `RouterLink` would produce and ignore the click.

Theme keys: {@api theme-key:SuggestionList}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title='shape="route"' description=" (similarity score chip)">
    <SuggestionList
      head="Did you mean"
      source="router.suggest()"
      shape="route"
      :items="routeSuggestions"
    />
    <template #footer>
      <span>the score chip formats a 0-to-1 similarity as a percentage; a row without <code>score</code> leaves the column empty</span>
      <span><code>sub</code> is the optional second line beneath the label</span>
    </template>
  </DemoCard>
  <DemoCard title='shape="action"' description=" (HTTP verb chip)">
    <SuggestionList head="Available actions" source="customer" shape="action" :items="actionSuggestions" />
    <template #footer>
      <span>the same rows with <code>shape="action"</code>: the trailing column carries <code>verb</code> instead of a score</span>
      <span>a verb chip states which method the action issues; it does not imply the reader may call it</span>
    </template>
  </DemoCard>
</VuedaDemo>

## DiagnosticStrip

{@api vue:component:DiagnosticStrip} is the two-column list of labels and values the 404 views put below their suggestions. An operator can copy the route, request id, or session from it into a ticket. Values render in monospace by default, because they exist to be pasted elsewhere; set [`mono`]{@api vue:component:DiagnosticStrip:prop:mono} to `false` for sentences.

The strip shows only the rows the view passes. It fetches nothing, and it changes nothing on the server.

Theme keys: {@api theme-key:DiagnosticStrip}.

<VuedaDemo class="grid gap-6 lg:grid-cols-2">
  <DemoCard title="default" description=" (mono values)">
    <DiagnosticStrip :rows="diagnosticRows" />
    <template #footer>
      <span>each row is a <code>dt</code> and <code>dd</code> pair</span>
      <span>intended for the body slot of a <code>SystemMessageCard</code>, which is where the 404 views place it</span>
    </template>
  </DemoCard>
  <DemoCard title=':mono="false"' description=" (prose values)">
    <DiagnosticStrip :mono="false" :rows="diagnosticProseRows" />
    <template #footer>
      <span>turn mono off when the values are sentences</span>
    </template>
  </DemoCard>
</VuedaDemo>

## ErrorDisplay

{@api vue:component:ErrorDisplay} is the error card the view layer renders above a failed surface. {@api vue:component:ActionForm} renders one above its form, so a failed save shows a card without any code in the view. It takes an [`errored`]{@api vue:component:ErrorDisplay:prop:errored} flag and an [`error`]{@api vue:component:ErrorDisplay:prop:error}. It formats an `Error`, a {@api js:class:@arrai-innovations/vueda/utils/errors#FetchError} with a response and server detail, an array of several, or a string.

It reports each distinct error to Sentry once. This docs site has no Sentry client, so the demos below report nothing.

A view can hide some errors from the card so another part of the page shows them. [`ignore-form-validation-errors`]{@api vue:component:ErrorDisplay:prop:ignoreFormValidationErrors} hides server validation errors, which belong on the fields. [`ignore-list-filter-errors`]{@api vue:component:ErrorDisplay:prop:ignoreListFilterErrors} hides filter errors, which belong on the filter chip. [`ignore-aborted-requests`]{@api vue:component:ErrorDisplay:prop:ignoreAbortedRequests}, on by default, hides cancelled requests, such as one the user left by navigating away.

The card reports a failure that already happened. Dismissing it does not retry or undo the request.

Theme keys: {@api theme-key:ErrorDisplay}.

<VuedaDemo class="grid gap-6">
  <DemoCard title="server error" description=" (status, statusText, and server detail)">
    <ErrorDisplay :error="conflictError" :errored="true" while-text="saving the customer" />
    <template #footer>
      <span>the card leads with the <code>while-text</code>, so the reader learns what failed before how</span>
      <span>the formatter stacks name and message, then <code>response.status</code> and <code>statusText</code>, then <code>responseData.detail</code></span>
    </template>
  </DemoCard>
  <DemoCard title="several errors at once">
    <ErrorDisplay :error="batchErrors" :errored="true" while-text="reconciling the batch" />
    <template #footer>
      <span>an array renders every entry in one card</span>
      <span>each distinct error reports once; a repeat of the same message is not reported again</span>
    </template>
  </DemoCard>
  <DemoCard title="dismissible">
    <ErrorDisplay :dismissible="true" :error="conflictError" :errored="true" while-text="saving the customer" />
    <template #footer>
      <span><code>dismissible</code> adds a close button that emits <code>dismiss-error</code>; the view that owns the card decides what that clears</span>
      <span>dismissing changes only the display. The failed request is not retried.</span>
    </template>
  </DemoCard>
</VuedaDemo>
