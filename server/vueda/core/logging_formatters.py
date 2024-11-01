import logging


class ConditionalExcInfoFormatter(logging.Formatter):
    """
    A formatter that only includes the exception information if the log record has an exception.

    This avoids a `None` in the log output when there is no exception, and `%(exc_info)s` is included in the format string.

    You do not need to include `%(exc_info)s` in the format string for this formatter to work.
    """

    def format(self, record):
        s = super().format(record)

        if record.exc_info:
            exc_text = self.formatException(record.exc_info)
            if exc_text:
                if not s.endswith("\n"):
                    s += "\n"
                s += exc_text
        return s
