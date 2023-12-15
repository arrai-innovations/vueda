# ══════════════════════════════════════════════════════════════════════════════
#  Copyright (c) 2023. Arrai Innovations Inc - All Rights Reserved             ═
# ══════════════════════════════════════════════════════════════════════════════
import sys
import argparse
from signal import SIGINT
from traceback import format_exception_only
from .update import update_for_main

def version(args):
    from . import __version__

    print(__version__)


def version_for_main(subparsers):
    parser = subparsers.add_parser(
        "version",
        description="Print the version of vueda-server.",
    )
    return version, parser

def main():
    parser = argparse.ArgumentParser(
        prog="vueda",
        description="Vueda CLI Interface",
    )

    subparsers = parser.add_subparsers(
        title="subcommands",
        dest="subcommand",
        required=True,
        help="The sub-command to run.",
    )
    commands = {}
    for name, setup_subparser in (
        ("update", update_for_main),
        ("verify", verify_for_main),
        ("version", version_for_main),
    ):
        commands[name], _parser = setup_subparser(subparsers)

    args = parser.parse_args()

    commands[args.subcommand](args)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n".join(format_exception_only(*sys.exc_info()[:2])), file=sys.stderr, end="")
        # exit codes higher than 128 are reserved for signals
        sys.exit(128 + SIGINT)