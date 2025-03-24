import argparse
import os
import shutil
import subprocess
import sys
import typing
from collections import OrderedDict
from contextlib import contextmanager
from traceback import format_exception

from argparse_color_formatter import ColorHelpFormatter
from argparse_color_formatter import ColorTextWrapper
from django.conf import settings
from test.support.os_helper import EnvironmentVarGuard

from vueda.cli import NoExitArgumentParser
from vueda.cli import blue_color
from vueda.cli import error_color
from vueda.cli import fake_arg_quoting
from vueda.cli import getch
from vueda.cli import open_orange
from vueda.cli import orange_color
from vueda.cli import reset_prompt


def get_tag():
    """
    Get the current git tag, if it exists.
    """
    tag_sp = subprocess.run(
        ["git", "describe", "--tags", "--abbrev=0", "--exact-match"],
        capture_output=True,
    )
    return tag_sp


class ExitWithCode(Exception):
    def __init__(self, *args, code=1):
        super().__init__(*args)
        self.code = code


def orange_char(stdout: typing.TextIO, stderr: typing.TextIO, default: str):
    """
    Get single character input, but color it orange.
    """
    answer = None
    try:
        stdout.write(open_orange)
        while answer is None:
            key = getch()
            if key.isprintable():
                answer = key.lower()
                stdout.write(key)
            elif "\n" in key or "\r" in key:
                answer = default
                stdout.write(f"({default})")
    except Exception:
        stderr.write("".join(format_exception(*sys.exc_info())))
        raise ExitWithCode()
    finally:
        stdout.write(reset_prompt + "\n")
    return answer


def orange_input(stdout: typing.TextIO, _stderr: typing.TextIO, default: str):
    """
    Get user input, but color it orange.
    """
    try:
        answer = input(open_orange)
        if answer == "":
            answer = default
            stdout.write(f"({default})")
    finally:
        stdout.write(reset_prompt)
    return answer


text_wrapper = ColorTextWrapper(width=80)


def wrap_text(text):
    return "\n".join(text_wrapper.wrap(text))


@contextmanager
def temp_terminal_width(width):
    old_width = text_wrapper.width
    text_wrapper.width = width
    try:
        yield
    finally:
        text_wrapper.width = old_width


def print_trace(
    stderr,
    message,
    trace,
):
    error_prefix = f"{error_color('Error')}: "
    print(wrap_text(f"{error_prefix}{message}"), file=stderr)
    with temp_terminal_width(text_wrapper.width - len(error_prefix)):
        for line in wrap_text(trace):
            print(f"{error_prefix}{line}", file=stderr)


def ask(
    stdout: typing.TextIO,
    stderr: typing.TextIO,
    question: str,
    choices: typing.List[str],
    default: str,
    non_interactive: bool = False,
):
    """
    Ask the user a question, with a list of choices and a default.
    """
    if non_interactive:
        return default
    char_input = all((len(x) == 1 for x in choices))
    get_answer = orange_char if char_input else orange_input
    answer = ""
    if "" in choices:
        raise ValueError("Choices cannot include an empty string.")
    if not all((x in choices for x in default)):
        raise ValueError("Default must be a subset of choices.")
    if not all((x.isprintable() for x in choices)):
        raise ValueError("Choices must be printable characters.")
    while answer not in choices:
        print(wrap_text(f"{question} [{'/'.join(choices)}] ({default}): "), file=stdout)
        answer = get_answer(stdout, stderr, default)
        input_choices = [choice.lower() for choice in choices]
        if answer not in input_choices:
            print(wrap_text(f"{error_color('Invalid choice')}: {answer}"), file=stderr)
    return answer


def ask_tag(
    stdout: typing.TextIO,
    stderr: typing.TextIO,
):
    """
    Ask the user which git tag they would like to check out.
    We should not show all tags because there are too many.
    We can show the last 5 tags and default to the latest tag.
    We should allow the user to enter a tag that is not in the list.
    We should allow HEAD as a tag, for development.
    """
    tags = subprocess.run(
        ["git", "for-each-ref", "--sort=-committerdate", "--format", "%(refname:lstrip=2)", "refs/tags"],
        capture_output=True,
    )
    if tags.returncode != 0:
        print_trace(stderr, "Could not get tags.", tags.stderr.decode())
        return tags.returncode
    tags = ["HEAD"] + tags.stdout.decode().splitlines()
    question = "Which tag would you like to check out?"
    default_tag = tags[1] if len(tags) > 1 and not settings.DEBUG else "HEAD"
    desired_tag = ""
    while desired_tag not in tags:
        # show head and last 5
        print(wrap_text(f"{question} [{'/'.join(tags[:6])}] ({default_tag}): "), file=stdout, end="")
        desired_tag = orange_input(stdout, stderr, default_tag)
        if desired_tag == "":
            desired_tag = default_tag
        # validate desired_tag is a git tag
        if desired_tag not in tags:
            print(wrap_text(f"{error_color('Invalid tag')}: {desired_tag}"), file=stderr)
    return desired_tag


def echo_and_eval(
    stdout: typing.TextIO,
    stderr: typing.TextIO,
    command: typing.Union[str, typing.List[str]],
    extra_env: dict = None,
    shell: bool = False,
):
    """
    Print a command to stdout and then execute it.
    """
    command_for_display = fake_arg_quoting(command)
    print(wrap_text(f"{blue_color(command_for_display)}"), file=stdout)
    env = EnvironmentVarGuard()
    with env:
        if extra_env:
            for key, value in extra_env.items():
                env[key] = value
        sp = subprocess.run(command, shell=shell)  # noqa: DUO116
    if sp.returncode != 0:
        print(
            wrap_text(f"{error_color('Error')}: {command_for_display} failed with code {sp.returncode}"),
            file=stderr,
        )
        raise ExitWithCode(code=sp.returncode)


def backup(stdout: typing.TextIO, stderr: typing.TextIO, non_interactive: bool = False):
    """
    Clean up backups older than a week. Create a new database backup.
    """
    # get config up front in this command, so we are not halfway through and throw an error
    backup_dir = os.path.expanduser(settings.DATABASE_BACKUP_DIR)
    database_name = settings.DATABASES["default"]["NAME"]
    database_user = settings.DATABASES["default"]["USER"]

    backup_dir_blue = blue_color(backup_dir)
    rev_sp = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True)
    if rev_sp.returncode != 0:
        print_trace(stderr, "Could not get current revision.", rev_sp.stderr.decode())
        raise ExitWithCode(code=rev_sp.returncode)
    rev = rev_sp.stdout.decode().strip()
    print(wrap_text(f"Your current git revision is: {blue_color(rev)}"), file=stdout)
    clean = ask(stdout, stderr, "Do you want to clean the database backup folder?", ["y", "n"], "y", non_interactive)
    if clean == "y":
        # skip if the backup dir doesn't exist
        if os.path.exists(backup_dir):
            # clean files from the backup directory older than a week.
            # files not in the format db_name-*.pg are ignored.
            echo_and_eval(
                stdout,
                stderr,
                ["find", backup_dir, "-type", "f", "-mtime", "+7", "-name", f"{database_name}_*.pg", "-delete"],
            )
        else:
            print(wrap_text(f"{orange_color('Skipping')}: {backup_dir_blue} doesn't exist"), file=stdout)
    doit = ask(stdout, stderr, "Do you want to backup the database?", ["y", "n"], "y", non_interactive)
    if doit == "y":
        # if the backup directory doesn't exist, create it
        if not os.path.exists(backup_dir):
            print(wrap_text(f"{orange_color('Creating')}: backup folder {backup_dir_blue}"), file=stdout)
            os.makedirs(backup_dir)
        # backup the database
        echo_and_eval(
            stdout,
            stderr,
            f"pg_dump -Fc -U {database_user} {database_name}"
            f' > "{backup_dir}/{database_name}_$(date +%F_%H%M)@{rev}.pg"',
            shell=True,
        )


def pull(
    stdout: typing.TextIO,
    stderr: typing.TextIO,
    non_interactive: bool = False,
):
    """
    Pull the latest code from git. if on main, we ask the user if they want to
    check out a tag. if on a branch, we pull.
    """
    branch_sp = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True)
    if branch_sp.returncode != 0:
        print_trace(stderr, "Could not get current branch.", branch_sp.stderr.decode())
        raise ExitWithCode(code=branch_sp.returncode)
    branch = branch_sp.stdout.decode().strip()
    # HEAD is the branch name if you are in a detached HEAD, like checking out a tag.
    if branch in ("main", "HEAD"):
        echo_and_eval(stdout, stderr, ["git", "fetch"])
        desired_tag = "HEAD" if non_interactive else ask_tag(stdout, stderr)
        # checkout desired_tag
        echo_and_eval(stdout, stderr, ["git", "checkout", desired_tag])
    else:
        echo_and_eval(stdout, stderr, ["git", "pull", "--rebase", "--stat"])


def install(
    stdout: typing.TextIO,
    stderr: typing.TextIO,
    non_interactive: bool = False,
):
    """
    Install the latest requirements, assuming modern projects use pipenv.

    Use sync so deploys get locked files, and so devs don't change the lock unintentionally.
    """
    install_cmd = ["pipenv", "sync"]
    if settings.DEBUG:
        install_cmd.append("--dev")
        print(
            wrap_text(f"{orange_color('Warning')}: Installing dev requirements, based on settings.DEBUG"),
            file=stdout,
        )
    else:
        print(
            wrap_text(f"{blue_color('Info')}: Installing production requirements, based on settings.DEBUG"),
            file=stdout,
        )
    echo_and_eval(stdout, stderr, install_cmd)
    clean_pipenv = ask(
        stdout, stderr, "Do you want to clean extraneous packages (pipenv clean)?", ["y", "n"], "y", non_interactive
    )
    if clean_pipenv == "y":
        echo_and_eval(stdout, stderr, ["pipenv", "clean"])


def static(
    stdout: typing.TextIO,
    stderr: typing.TextIO,
    non_interactive: bool = False,
):
    """
    Run Django management command 'collectstatic', if on a live site.
    """
    cmd = ["pipenv", "run", "python", "manage.py", "collectstatic", "--traceback"]
    if non_interactive:
        cmd.append("--noinput")
    if not settings.DEBUG:
        echo_and_eval(stdout, stderr, cmd)
    else:
        print(
            wrap_text(f"{orange_color('Skipping')}: {blue_color('`collectstatic`')} is only run on live sites"),
            file=stdout,
        )


def migrate(
    stdout: typing.TextIO,
    stderr: typing.TextIO,
    non_interactive: bool = False,
):
    """
    Run Django management command 'migrate' and 'remove_stale_contenttypes'.
    """
    migrate_cmd = ["pipenv", "run", "python", "manage.py", "migrate", "--traceback"]
    stale_cmd = ["pipenv", "run", "python", "manage.py", "remove_stale_contenttypes", "--traceback"]
    if non_interactive:
        migrate_cmd.append("--noinput")
        stale_cmd.append("--noinput")
    echo_and_eval(stdout, stderr, migrate_cmd)
    echo_and_eval(stdout, stderr, stale_cmd)


def post(stdout: typing.TextIO, stderr: typing.TextIO, non_interactive: bool = False):
    """
    Run post-update commands. This is historical at the moment.
    """
    pass


all_steps = OrderedDict(
    [
        ("backup", backup),
        ("pull", pull),
        ("install", install),
        ("static", static),
        ("migrate", migrate),
        ("post", post),
    ]
)


def run(
    parsed_args: argparse.Namespace,
    *,
    exit_on_error=True,  # no tests yet but this will be useful for them
    terminal_width=None,
):
    if not terminal_width:
        try:
            terminal_size = shutil.get_terminal_size((80, 20))
            terminal_width = terminal_size[0]
        except Exception:
            terminal_width = 80
    if text_wrapper.width != terminal_width:
        text_wrapper.width = terminal_width
    stdout = sys.stdout
    stderr = sys.stderr
    non_interactive = parsed_args.non_interactive
    all_steps_keys = list(all_steps.keys())
    all_step_values = list(all_steps.values())
    steps = all_step_values[all_steps_keys.index(parsed_args.first_step) :]
    if parsed_args.only:
        steps = steps[:1]

    for step in steps:
        try:
            step(stdout=stdout, stderr=stderr, non_interactive=non_interactive)
        except ExitWithCode as ewc:
            if exit_on_error:
                sys.exit(ewc.code)
            else:
                return ewc.code


def update_for_main(subparsers=None, exit_on_error=True):
    parser_args = {
        "formatter_class": ColorHelpFormatter,
        "prog": "update",
        "description": f"Helper for update a {blue_color('vueda-server')} installation. Includes steps for backing"
        f" up the database, pulling the latest code, installing dependencies, collecting static"
        f" files, migrating the database and running post-update commands.",
    }
    argparse_class = argparse.ArgumentParser if exit_on_error else NoExitArgumentParser
    if subparsers:  # we are a subcommand, attach to the parent parser
        parser_args["name"] = parser_args.pop("prog")
        parser = subparsers.add_parser(**parser_args)
    else:
        parser = argparse_class(**parser_args)
    all_steps_keys = list(all_steps.keys())
    parser.add_argument(
        "first_step",
        choices=all_steps_keys,
        default=all_steps_keys[0],
        nargs="?",
        help="The first step to run. Default: %(default)s",
    )
    parser.add_argument(
        "--only",
        "-o",
        action="store_true",
        help="Only run the first step. Default: %(default)s",
    )
    parser.add_argument(
        "--non-interactive",
        "-n",
        action="store_true",
        help="Run in non-interactive mode using default values.",
    )
    # caller runs the parser and passes the args to run
    return run, parser


if __name__ == "__main__":
    main_run, main_parser = update_for_main()
    main_args = main_parser.parse_args()
    main_run(main_args)
