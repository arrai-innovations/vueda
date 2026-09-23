---
layout: home
title: Build business applications with Django and Vue
description: Turn Django models, serializers, and viewsets into Vue forms, lists, and detail screens. Add workflows, permissions, and audit history with VUEDA.
type: index
audience: integrator
status: draft
markdownStyles: false
hero:
    layout: wide
    eyebrow: VUEDA / Django + Vue
    name: Build business applications
    text: with Django and Vue.
    tagline: Turn your Django models, serializers, and viewsets into Vue forms, lists, and detail screens. Add workflows, permissions, and audit history, with room to make the UI your own.
    note: For Django teams building tools their business runs on.
    actions:
        - theme: brand
          text: Start building →
          link: /tutorials/start-building.html
        - theme: alt
          text: View on GitHub
          link: https://github.com/arrai-innovations/vueda
          target: _self
head:
    - - meta
      - property: og:title
        content: VUEDA | Build business applications with Django and Vue
    - - meta
      - property: og:description
        content: Django definitions. Vue application screens. Workflows, permissions, and audit history, with room to make the UI your own.
    - - meta
      - property: og:type
        content: website
---

<script setup>
import HomePage from "./.vitepress/theme/components/HomePage.vue";
</script>

<HomePage>
<template #define>

```python
class PurchaseOrder(VuedaModel):
    reference = models.CharField(max_length=32)
    supplier = models.ForeignKey(Supplier, ...)
    order_date = models.DateField()


class PurchaseOrderViewSet(VuedaViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
```

</template>
<template #describe>

```json
{
  "verbose_name": "purchase order",
  "model_fields": {
    "supplier": {
      "label": "Supplier",
      "required": true,
      "type_model": "ForeignKey",
      "model": "supplier"
    },
    "order_date": { ... }
  },
  "model_actions": [{ "name": "update", ... }]
}
```

</template>
</HomePage>
