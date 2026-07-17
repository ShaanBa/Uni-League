import re
import bcrypt

def validate_email(email: str):
    if email.endswith(".edu"):
        # Match anything ending in .edu, extracting domain part
        match = re.search(r"@([\w.-]+\.edu)$", email.lower().strip())
        if match:
            return (True, match.group(1))
    return (False, None)

def validate_password_strength(password: str):
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number."
    if not any(c.isalpha() for c in password):
        return False, "Password must contain at least one letter."
    return True, None

def hash_password(plain_text):
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_text.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def check_password(plain_text, hashed_text):
    try:
        return bcrypt.checkpw(plain_text.encode('utf-8'), hashed_text.encode('utf-8'))
    except Exception:
        return False

        