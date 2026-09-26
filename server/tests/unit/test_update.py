import io

from vueda.cli import error_color
from vueda.update import print_trace


def test_print_trace_prints_each_trace_line_with_the_error_prefix():
    stderr = io.StringIO()

    print_trace(stderr, "Could not get tags.", "fatal: not a git repository\nStopping at filesystem boundary.\n")

    prefix = f"{error_color('Error')}: "
    assert stderr.getvalue().splitlines() == [
        f"{prefix}Could not get tags.",
        f"{prefix}fatal: not a git repository",
        f"{prefix}Stopping at filesystem boundary.",
    ]
