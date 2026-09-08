"""Celery tasks for sending queue items and processing SMS status updates."""

__all__ = (
    "BaseTask",
    "CheckUnknownSMSMessageTask",
    "QueueProcessor",
    "check_previously_received_message_sid",
    "check_sms_status",
    "check_sms_timeout_only",
    "send_message",
)

import logging
from traceback import format_exc

from celery.contrib.django.task import DjangoTask
from celery.exceptions import Ignore
from django.conf import settings
from django.db import transaction
from django.db.models import Min

from vueda.core.audit import audited_action
from vueda.vdq.celery import app
from vueda.vdq.celery import cancel_task
from vueda.vdq.exceptions import AnymailTransientError
from vueda.vdq.handlers import TwilioQueueItemHandler
from vueda.vdq.handlers import send_email
from vueda.vdq.models import QueueItem
from vueda.vdq.models import SMSQueueItem
from vueda.vdq.utils import lock_queue_item
from vueda.workflow.exceptions import InvalidTransitionError


logger = logging.getLogger(__name__)


class AuditedTask(DjangoTask):
    """Runs a task body inside one named action context.

    Delivery writes to several tables per message and has no request to take a context from, so
    without this each write would record an event that nothing associates with the rest.
    """

    abstract = True

    def __call__(self, *args, **kwargs):
        with audited_action(self.name, kind="task"):
            return super().__call__(*args, **kwargs)


class BaseTask(AuditedTask):
    autoretry_for = (AnymailTransientError,)
    retry_backoff = 2**4
    max_retries = 12
    retry_jitter = False
    abstract = True

    def __init__(self):
        super().__init__()
        self.twilio = TwilioQueueItemHandler()


class QueueProcessor(BaseTask):
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        qi_pk = args[0]
        try:
            with lock_queue_item(qi_pk) as qi:
                if not qi:
                    cancel_task(task_id)
                qi.task_id = task_id
                try:
                    if einfo.exception.exc.when:
                        qi.retry_delay = einfo.exception.exc.when
                except AttributeError:
                    # Celery's retry metadata doesn't always expose `exc.when`; skip when it's absent.
                    pass
                qi.save(update_fields=["task_id", "retry_delay"])
                qi.fast_transition("delay")
        except Exception as exc:
            logger.exception(
                "Failed to update QueueItem during on_retry (task_id=%s, qi_pk=%s): %s: %s",
                task_id,
                qi_pk,
                type(exc).__name__,
                exc,
            )

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        qi_pk = args[0]
        method = args[1]
        try:
            with lock_queue_item(qi_pk) as qi:
                if not qi:
                    return
                logger.exception("There was an error while sending %s for QueueItem %s", method, qi.pk)
                if qi.result:
                    qi.result += "\n*** During handling of the above exception, another exception occurred: ***\n"
                qi.result += format_exc()
                qi.retry_delay = 0
                qi.save(update_fields=["result", "retry_delay"])
                if qi.workflow_state.code != "errored":
                    qi.fast_transition("error")
        except Exception as exc:
            logger.exception(
                "Failed to update QueueItem status during on_failure (task_id=%s, qi_pk=%s): %s: %s",
                task_id,
                qi_pk,
                type(exc).__name__,
                exc,
            )


@app.task(name="vdq.check_sms_status", base=BaseTask, bind=True)
def check_sms_status(self):
    queue = QueueItem.objects.filter(
        object_states_proxy__state__code="awaiting",
        method="sms",
        sms__message_sid__isnull=False,
    ).order_by("queued")
    oldest = queue.aggregate(min_queued=Min("queued"))["min_queued"]
    if not oldest:
        return
    self.twilio.pull_sms_status(oldest)


@app.task(name="vdq.check_sms_timeout_only", base=BaseTask, bind=True)
def check_sms_timeout_only(self):
    self.twilio.pull_sms_timeout_only()


@app.task(name="vdq.send_message", base=QueueProcessor, bind=True)
def send_message(self, qi_pk, method):
    try:
        with lock_queue_item(qi_pk) as qi:
            if not qi:
                raise Ignore()
            qi.fast_transition("send")
        if method == "sms":
            self.twilio.send_sms(qi)
        elif method == "email":
            send_email(qi)
        else:
            raise ValueError(f"Unknown method {method!r}")
    except (QueueItem.DoesNotExist, InvalidTransitionError) as e:
        logger.error("Send message task did not execute. %s", str(e))
        raise Ignore()


class CheckUnknownSMSMessageTask(AuditedTask):
    autoretry_for = (QueueItem.DoesNotExist,)
    default_retry_delay = 10
    retry_jitter = False
    timeout_hours = getattr(settings, "VDQ_TWILIO_SMS_TIMEOUT_HOURS", 2)

    def __init__(self):
        super().__init__()
        self.twilio = TwilioQueueItemHandler()
        self.max_retries = int(self.timeout_hours * 3600 // self.default_retry_delay)

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        message_id = args[0]
        logger.error(
            "Received a twilio message, but did not see a queue item with the message id %s after %s hours.",
            message_id,
            self.timeout_hours,
        )


@app.task(name="vdq.check_previously_received_message_sid", base=CheckUnknownSMSMessageTask, bind=True)
def check_previously_received_message_sid(self, message_sid, message_status):
    with transaction.atomic():
        qi = (
            QueueItem.objects.select_related(
                "sms",
            )
            .select_for_update(skip_locked=True, of=("self",))
            .prefetch_related("object_states_proxy")
            .filter(sms__message_sid=message_sid)
            .first()
        )
        if qi:
            SMSQueueItem.objects.select_for_update(of=("self",)).get(queue_item=qi)
            self.twilio.update_sms_qi(qi, message_status, webhook=True)
