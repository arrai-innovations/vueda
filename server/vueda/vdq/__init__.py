"""VUEDA Dispatch Queue (VDQ): email and SMS delivery through Celery."""

__all__ = ("celery_app",)

from vueda.vdq.celery import app as celery_app
