from django.contrib.auth.tokens import PasswordResetTokenGenerator


class Sha3PasswordResetTokenGenerator(PasswordResetTokenGenerator):
    algorithm = "sha3_512"
