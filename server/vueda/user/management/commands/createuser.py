# Copyright (C) 2017 Emergence by Design Inc. - All Rights Reserved
from django.apps import apps
from django.contrib.auth.management.commands.createsuperuser import Command as CreateSuperUserCommand
from django.core.management.base import CommandError
from django.db.transaction import atomic


class Command(CreateSuperUserCommand):
    """Create a regular user."""

    help = "Used to create a user."
    username = None

    def add_arguments(self, parser):
        super(Command, self).add_arguments(parser)
        parser.add_argument(
            "--groups",
            action="store",
            dest="groups",
            default=None,
            help="Specifies a comma-separated list of group names to add to the new user.",
        )

    @atomic
    def handle(self, *args, **options):
        if options["groups"] is None:
            groups_string = input("Please specify a comma-separated list of group names to which to add the user.")
        else:
            groups_string = options["groups"]
        group_names = [x.strip() for x in groups_string.split(",") if x.strip()]
        groups = apps.get_model("auth", "Group").objects.filter(name__in=group_names)
        if groups.count() < len(group_names):
            missing_groups = [
                '"{}"'.format(group)
                for group in set(group_names).difference(set(groups.values_list("name", flat=True)))
            ]
            missing_groups.sort()
            if len(missing_groups) > 1:
                missing_groups_plural = True
                missing_groups[-1] = "{} and {}".format(missing_groups[-2], missing_groups.pop(-1))
            else:
                missing_groups_plural = False
            raise CommandError(
                "The Group{plural} with name{plural} {missing_groups} {plural_does} not exist!".format(
                    plural=missing_groups_plural and "s" or "",
                    missing_groups=", ".join(missing_groups),
                    plural_does="do" if missing_groups_plural else "does",
                )
            )
        results = super(Command, self).handle(*args, **options)
        if self.username is None:
            try:
                self.username = options[self.username_field.name]
            except KeyError:
                raise CommandError("You must specify a username.")

        user = self.UserModel.objects.get(**{self.username_field.name: self.username})
        user.is_superuser = False
        user.save()
        user.groups.set(groups)
        if options["verbosity"] >= 1:
            self.stdout.write("Assigned Groups and removed Superuser flag.")
        return results

    def get_input_data(self, field, message, default=None):
        val = super(Command, self).get_input_data(field, message, default)
        if field == self.username_field:
            # We need to store the username so that we can get the user object later.
            self.username = val

        return val
