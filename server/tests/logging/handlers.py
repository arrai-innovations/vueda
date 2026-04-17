import logging

from django.db import connections


class DBHandler(logging.Handler):
    def emit(self, record):
        message = record.getMessage()
        name = record.levelname
        process_id = record.process
        traceback = record.exc_text or ""

        connection = connections["db_logging"]
        with connection.cursor() as cursor:
            cursor.execute(
                "BEGIN; INSERT INTO logging_logrecords (created, message, name, process_id, traceback) VALUES (now(), %s, %s, %s, %s); COMMIT;",
                (message, name, process_id, traceback),
            )
