import subprocess


def get_tag():
    tag_sp = subprocess.run(
        ["git", "describe", "--tags", "--abbrev=0", "--exact-match"],
        capture_output=True,
    )
    return tag_sp
