from django.template.loader import render_to_string


class LogoutMixin:
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["logout"] = render_to_string("registration/logout_form.html", context=context, request=self.request)
        return context
