"""SHA-3 based password reset token generator."""

__all__ = ("Sha3PasswordResetTokenGenerator",)

from django.contrib.auth.tokens import PasswordResetTokenGenerator


class Sha3PasswordResetTokenGenerator(PasswordResetTokenGenerator):
    algorithm = "sha3_512"
