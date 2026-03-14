"""VUEDA Delivery Queue for email and SMS dispatch via Celery."""

__all__ = ("celery_app",)

from vueda.vdq.celery import app as celery_app
