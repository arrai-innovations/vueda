import argparse
import os
import os.path
import sys
from signal import SIGINT
from traceback import format_exception_only

from vueda.update import update_for_main


def version(args):
    from vueda import __version__

    print(__version__)


def version_for_main(subparsers):
    parser = subparsers.add_parser(
        "version",
        description="Print the version of vueda-server.",
    )
    return version, parser


def setup_django_settings_module():
    """
    use environs to check .env.local then .env for DEBUG. If not set, default to False.
    if DEBUG is True, use config.settings.local, else use config.settings.production
    """
    from environs import Env

    # check that .env / .env.local are in the cwd.
    # there should aways be a .env
    # complain if there is no .env
    cwd = os.getcwd()
    if not os.path.isfile(os.path.join(cwd, ".env")):
        print(f"ERROR: No .env file found in {cwd}", file=sys.stderr)
        sys.exit(1)

    env = Env()
    env.read_env(".env.local")
    env.read_env(".env")

    debug = env.bool("DEBUG", default=False)

    if not os.environ.get("DJANGO_SETTINGS_MODULE"):
        os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.local" if debug else "config.settings.production"

    # this isn't going to work with cwd on the path
    sys.path.append(os.getcwd())


def main():
    setup_django_settings_module()
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
