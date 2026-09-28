- **Field choices for serializer-only fields require model permissions**:
    - The field-choices endpoint served choices for a serializer field that maps to no model field or relation without any permission check, to anonymous users too. For a related field, that listed every row of its queryset. Such a field now requires `read` on the serializer's model, and a related one also requires `list` on its queryset's model, the same as a model relation.
      _Grant those permissions to users whose forms show choices for serializer-only fields._
