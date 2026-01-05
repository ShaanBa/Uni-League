import re
def validate_email(email: str):
    if email.endswith(".edu"):
        match = re.search("@([\w.-]+\.edu)$",email)
        if match:
            return (True, match.group(1))
    return (False, None)
    