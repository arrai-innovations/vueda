# ══════════════════════════════════════════════════════════════════════════════
#  Copyright (c) 2023. Arrai Innovations Inc - All Rights Reserved             ═
# ══════════════════════════════════════════════════════════════════════════════
import argparse
import shutil
import subprocess
import sys
from argparse_color_formatter import ColorHelpFormatter
from argparse_color_formatter import ColorTextWrapper
from collections import OrderedDict
from test.support.os_helper import EnvironmentVarGuard
from traceback import format_exception

from cli import fake_arg_quoting
from cli import blue_color
from cli import error_color
from cli import getch
from cli import open_orange
from cli import orange_color
from cli import reset_prompt
from cli import NoExitArgumentParser
from sentry import get_tag


# todo: the steps are badass centric for now. we'll need to update them or change which steps exist for vueda.

class Update():
    def __init__(self, *, stdout=sys.stdout, stderr=sys.stderr, terminal_width=80, exit_on_error=True, parser=None):
        self.stdout = stdout
        self.stderr = stderr
        self.terminal_width = terminal_width
        self.exit_on_error = exit_on_error
        if exit_on_error:
            self.arparse_class = argparse.ArgumentParser
        else:
            self.arparse_class = NoExitArgumentParser
        self.text_wrapper = ColorTextWrapper(width=self.terminal_width)
        self.all_steps = OrderedDict([
            ('backup', self.backup),
            ('pull', self.pull),
            ('install', self.install),
            ('static', self.static),
            ('migrate', self.migrate),
            ('post', self.post),
            ('report', self.report),
        ])
        self.parser = parser if parser else self.get_parser()

    def get_parser(self):
        return self.arparse_class(**self.parser_args())

    def parser_args(self, subparsers=None):
        return {
            "formatter_class": ColorHelpFormatter,
            "prog": "update",  # this is also the subcommand name. colors here would make the subcommand hard to type
            "description": f"Helper for update a {blue_color('vueda-server')} installation. Includes steps for backing"
                           f" up the database, pulling the latest code, installing dependencies, collecting static"
                           f" files, migrating the database, running post-update commands and reporting deployment"
                           f" to sentry.",
        }

    def add_arguments(self):
        all_steps_keys = list(self.all_steps.keys())
        self.parser.add_argument(
            "first_step",
            choices=all_steps_keys,
            default=all_steps_keys[0],
            nargs="?",
            help="The first step to run. Default: %(default)s",
        )
        self.parser.add_argument(
            "--only",
            "-o",
            action="store_true",
            help="Only run the first step. Default: %(default)s",
        )

    def wrap_text(self, text):
        return "\n".join(self.text_wrapper.wrap(text))

    def orange_char(self, default):
        """
        Get single character input, but color it orange.
        """
        answer = None
        try:
            self.stdout.write(open_orange)
            while answer is None:
                key = getch()
                if key.isprintable():
                    answer = key.lower()
                    self.stdout.write(key)
                elif "\n" in key or "\r" in key:
                    answer = default
                    self.stdout.write(f"({default})")
        except Exception:
            self.stdout.write(reset_prompt)
            self.stdout.write("".join(format_exception(*sys.exc_info())))
            sys.exit(1)
        finally:
            self.stdout.write(f"{reset_prompt}\n")
        return answer

    def orange_input(self, default):
        """
        Get user input, but color it orange.
        """
        try:
            answer = input(open_orange)
            if answer == "":
                answer = default
                self.stdout.write(f"({default})")
        finally:
            self.stdout.write(reset_prompt)
        return answer

    def ask(self, question, choices, default):
        """
        Ask the user a question, with a list of choices and a default.
        """
        char_input = all((len(x) == 1 for x in choices))
        get_answer = self.orange_char if char_input else self.orange_input
        answer = ""
        if "" in choices:
            raise ValueError("Choices cannot include an empty string.")
        if not all((x in choices for x in default)):
            raise ValueError("Default must be a subset of choices.")
        if not all((x.isprintable() for x in choices)):
            raise ValueError("Choices must be printable characters.")
        while answer not in choices:
            print(self.wrap_text(f"{question} [{'/'.join(choices)}] ({default}): "), file=self.stdout)
            answer = get_answer(default)
            input_choices = [choice.lower() for choice in choices]
            if answer not in input_choices:
                print(self.wrap_text(f"{error_color('Invalid choice')}: {answer}"), file=self.stderr)
        return answer

    def ask_tag(self):
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
            self.print_trace("Could not get tags.", tags.stderr.decode())
            self.exit_code = tags.returncode
            return
        tags = ["HEAD"] + tags.stdout.decode().splitlines()
        question = "Which tag would you like to check out?"
        default_tag = tags[1] if len(tags) > 1 and not config.DJANGO_DEBUG_MODE else "HEAD"
        desired_tag = ""
        while desired_tag not in tags:
            # show head and last 5
            print(self.wrap_text(f"{question} [{'/'.join(tags[:6])}] ({default_tag}): "), file=self.stdout, end="")
            desired_tag = self.orange_input(default_tag)
            if desired_tag == "":
                desired_tag = default_tag
            # validate desired_tag is a git tag
            if desired_tag not in tags:
                print(self.wrap_text(f"{error_color('Invalid tag')}: {desired_tag}"), file=self.stderr)
        return desired_tag

    def print_trace(self, message, trace):
        error_prefix = f"{error_color('Error')}: "
        print(self.wrap_text(f"{error_prefix}{message}"), file=self.stderr)
        ColorTextWrapper(width=self.terminal_width - len(error_prefix))
        for line in self.wrap_text(trace):
            print(f"{error_prefix}{line}", file=self.stderr)

    def echo_and_eval(self, command, extra_env=None, shell=False):
        """
        Print a command to stdout and then execute it.
        """
        command_for_display = fake_arg_quoting(command)
        print(self.wrap_text(f"{blue_color(command_for_display)}"), file=self.stdout)
        env = EnvironmentVarGuard()
        with env:
            if extra_env:
                for key, value in extra_env.items():
                    env[key] = value
            sp = subprocess.run(command, shell=shell)  # noqa: DUO116
        if sp.returncode != 0:
            print(
                self.wrap_text(f"{error_color('Error')}: {command_for_display} failed with code {sp.returncode}"),
                file=self.stderr,
            )
            self.exit_code = sp.returncode

    def backup(self):
        """
        Clean up backups older than a week. Create a new database backup.
        """
        # get config up front in this command, so we are not halfway through and throw an error
        backup_dir = os.path.expanduser(config.DATABASE_BACKUP_DIR)
        database_name = config.DATABASE_NAME
        database_user = config.DATABASE_USER

        backup_dir_blue = blue_color(backup_dir)
        rev_sp = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True)
        if rev_sp.returncode != 0:
            self.print_trace("Could not get current revision.", rev_sp.stderr.decode())
            self.exit_code = rev_sp.returncode
            return
        rev = rev_sp.stdout.decode().strip()
        print(self.wrap_text(f"Your current git revision is: {blue_color(rev)}"), file=self.stdout)
        clean = self.ask("Do you want to clean the database backup folder?", ["y", "n"], "y")
        if clean == "y":
            # skip if the backup dir doesn't exist
            if os.path.exists(backup_dir):
                # clean files from the backup directory older than a week.
                # files not in the format db_name-*.pg are ignored.
                self.echo_and_eval(
                    ["find", backup_dir, "-type", "f", "-mtime", "+7", "-name", f"{database_name}_*.pg", "-delete"]
                )
                if self.exit_code:
                    return self.exit_code
            else:
                print(self.wrap_text(f"{orange_color('Skipping')}: {backup_dir_blue} doesn't exist"), file=self.stdout)
        doit = self.ask("Do you want to backup the database?", ["y", "n"], "y")
        if doit == "y":
            # if the backup directory doesn't exist, create it
            if not os.path.exists(backup_dir):
                print(self.wrap_text(f"{orange_color('Creating')}: backup folder {backup_dir_blue}"), file=self.stdout)
                os.makedirs(backup_dir)
            # backup the database

            self.echo_and_eval(
                f"pg_dump -Fc -U {database_user} {database_name}"
                f' > "{backup_dir}/{database_name}_$(date +%F_%H%M)@{rev}.pg"',
                shell=True,
            )
            if self.exit_code:
                return self.exit_code

    def pull(self):
        """
        Pull the latest code from git. if on main, we ask the user if they want to
        check out a tag. if on a branch, we pull.
        """
        branch_sp = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True)
        if branch_sp.returncode != 0:
            self.print_trace("Could not get current branch.", branch_sp.stderr.decode())
            self.exit_code = branch_sp.returncode
            return
        branch = branch_sp.stdout.decode().strip()
        # HEAD is the branch name if you are in a detached HEAD, like checking out a tag.
        if branch in ("main", "HEAD"):
            self.echo_and_eval(["git", "fetch"])
            if self.exit_code:
                return self.exit_code
            desired_tag = self.ask_tag()
            if self.exit_code:
                return self.exit_code
            # checkout desired_tag
            self.echo_and_eval(["git", "checkout", desired_tag])
        else:
            self.echo_and_eval(["git", "pull", "--rebase", "--stat"])
        if self.exit_code:
            return self.exit_code

    def install(self):
        """
        Install the latest requirements, assuming modern projects use pipenv.

        Use sync so deploys get locked files, and so devs don't change the lock unintentionally.
        """
        install_cmd = ["pipenv", "sync"]
        if config.DJANGO_DEBUG_MODE:
            install_cmd.append("--dev")
            print(
                self.wrap_text(f"{orange_color('Warning')}: Installing dev requirements, based on DJANGO_DEBUG_MODE"),
                file=self.stdout,
            )
        else:
            print(
                self.wrap_text(f"{blue_color('Info')}: Installing production requirements, based on DJANGO_DEBUG_MODE"),
                file=self.stdout,
            )

        self.echo_and_eval(install_cmd)
        if self.exit_code:
            return self.exit_code
        clean_pipenv = self.ask("Do you want to clean extraneous packages in the pipenv?", ["y", "n"], "y")
        if clean_pipenv == "y":
            self.echo_and_eval(["pipenv", "clean"])
            if self.exit_code:
                return self.exit_code

    def static(self):
        """
        Run Django management command 'collectstatic', if on a live site.
        """
        if not config.DJANGO_DEBUG_MODE:
            self.echo_and_eval(["pipenv", "run", "python", "manage.py", "collectstatic", "--noinput", "--traceback"])
            if self.exit_code:
                return self.exit_code
        else:
            collect_static = blue_color("`collectstatic`")
            print(
                self.wrap_text(f"{orange_color('Skipping')}: {collect_static} is only run on live sites"),
                file=self.stdout,
            )

    def migrate(self):
        """
        Run Django management command 'migrate' and 'remove_stale_contenttypes'.
        """
        self.echo_and_eval(["pipenv", "run", "python", "manage.py", "migrate", "--traceback"])
        if self.exit_code:
            return self.exit_code
        self.echo_and_eval(["pipenv", "run", "python", "manage.py", "remove_stale_contenttypes", "--traceback"])
        if self.exit_code:
            return self.exit_code

    def post(self):
        """
        Run Badass management command `run_post_migration`
        """
        self.echo_and_eval(["pipenv", "run", "python", "manage.py", "run_post_migration", "--traceback"])
        if self.exit_code:
            return self.exit_code

    def report(self):
        """
        Let Sentry know about our deployment.
        """
        if not config.DJANGO_DEBUG_MODE:
            # get config up front in this command, so we are not halfway through and throw an error
            sentry_environment = config.SENTRY_ENVIRONMENT
            sentry_deploy_url = config.SENTRY_DEPLOY_URL
            sentry_project = config.SENTRY_PROJECT
            sentry_auth_token = config.SENTRY_AUTH_TOKEN

            sentry_org_sp = subprocess.run(
                ["git", "remote", "get-url", "origin"],
                capture_output=True,
            )
            if sentry_org_sp.returncode != 0:
                self.print_trace("Could not get Sentry organization", sentry_org_sp.stderr.decode())
                self.exit_code = sentry_org_sp.returncode
                return
            sentry_org = sentry_org_sp.stdout.decode().strip().split(":")[1].split("/")[0]
            exact_tag_sp = get_tag()
            if exact_tag_sp.returncode != 0:
                self.print_trace("Current HEAD is not a tag.", exact_tag_sp.stderr.decode())
                self.exit_code = exact_tag_sp.returncode
                return
            exact_tag = exact_tag_sp.stdout.decode().strip()
            self.echo_and_eval(
                [
                    "sentry-cli",
                    "deploys",
                    "new",
                    "--env",
                    sentry_environment,
                    "--release",
                    f"{sentry_project}-{exact_tag}",
                    "--url",
                    sentry_deploy_url,
                ],
                extra_env={
                    "SENTRY_ORG": sentry_org,
                    "SENTRY_PROJECT": sentry_project,
                    "SENTRY_AUTH_TOKEN": sentry_auth_token,
                },
            )
            if self.exit_code:
                return self.exit_code
        else:
            print(
                self.wrap_text(f"{orange_color('Skipping')}: Sentry reporting is only run on live sites"),
                file=self.stdout,
            )

    def run(self, parsed_args: argparse.Namespace):
        """
        Runs the updater.

        Pass args, or ArgumentParser will get them from sys.argv
        """
        all_steps_keys = list(self.all_steps.keys())
        all_step_values = list(self.all_steps.values())
        steps = all_step_values[all_steps_keys.index(parsed_args.first_step) :]
        if parsed_args.only:
            steps = steps[:1]

        for step in steps:
            exit_code = step()
            if exit_code:
                if self.exit_on_error:
                    sys.exit(exit_code)
                else:
                    return exit_code



def update_for_main(subparsers=None):
    terminal_size = shutil.get_terminal_size((80, 20))
    cmd = Update(stdout=sys.stdout, stderr=sys.stderr, terminal_size=terminal_size[0])
    if subparsers:
        parser_args = cmd.parser_args(subparsers)
        parser_args['name'] = parser_args.pop("prog")
        cmd.parser = subparsers.add_parser(**parser_args)
    cmd.add_arguments()
    return cmd.run, cmd.parser


if __name__ == "__main__":
    update_call, update_parser = update_for_main(subparsers)
    args = update_parser.parse_args()
    update_call(args)

:
