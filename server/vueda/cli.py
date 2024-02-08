# ══════════════════════════════════════════════════════════════════════════════
#  Copyright (c) 2023. Arrai Innovations Inc - All Rights Reserved             ═
# ══════════════════════════════════════════════════════════════════════════════
import argparse
import sys
import termios
import tty
from functools import partial


try:
    # future: drop this when we drop prior to python 3.13
    # noinspection PyCompatibility
    from pipes import quote as shell_quote
except ImportError:
    from shlex import quote as shell_quote

from colors import color


blue_color = partial(color, fg="#0077f7", style="bold")  # arrai blue
orange_color = partial(color, fg="#ff7f00", style="bold")  # complimentary orange
open_orange = "\x1b[38;2;255;127;0m\x1b[1m"  # for user input
reset_prompt = "\x1b[0m"  # after user input
error_color = partial(color, fg="#ff0000", style="bold")  # error red


def getch():
    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        ch = sys.stdin.read(1)
        if ch in ("\x03", "\x1b"):
            raise KeyboardInterrupt
        if ch == "\x04":
            raise EOFError
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
    return ch


class BadArgumentError(ValueError):
    pass


class NoExitArgumentParser(argparse.ArgumentParser):
    def error(self, message):
        raise BadArgumentError(message)


def fake_arg_quoting(cl_args):
    """
    Fake the quoting of arguments for display purposes.
    """
    if issubclass(type(cl_args), str):
        return cl_args
    return " ".join([shell_quote(arg) for arg in cl_args])
