from celery import Celery
from django.db import transaction


app = Celery("vueda.vdq", include=["vueda.vdq.tasks"])
app.config_from_object("django.conf:settings", namespace="CELERY")


@app.on_after_configure.connect
def setup_periodic_tasks(sender: Celery, **kwargs):
    from django.conf import settings

    try:
        import twilio  # noqa: F401

        has_twilio = True
    except ImportError:
        has_twilio = False

    if (
        has_twilio
        and getattr(settings, "TWILIO_ACCOUNT_SID", None)
        and not getattr(settings, "TWILIO_WEBHOOK_URL", False)
    ):
        sig = sender.signature("vdq.check_sms_status")
        sender.add_periodic_task(30.0, sig, name="check-sms-status")

    if has_twilio and getattr(settings, "TWILIO_ACCOUNT_SID", None) and getattr(settings, "TWILIO_WEBHOOK_URL", False):
        sig = sender.signature("vdq.check_sms_timeout_only")
        sender.add_periodic_task(30.0, sig, name="check-sms-status-timeout-only")


def cancel_task(task_id):
    transaction.on_commit(lambda: app.control.revoke(task_id, terminate=False))
    return f"Task {task_id} cancelled"
