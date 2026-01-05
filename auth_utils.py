import re
import bcrypt
def validate_email(email: str):
    if email.endswith(".edu"):
        match = re.search("@([\w.-]+\.edu)$",email)
        if match:
            return (True, match.group(1))
    return (False, None)

def hash_password(plain_text):
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_text.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def check_password(plain_text, hashed_text):
    return bcrypt.checkpw(plain_text.encode('utf-8'), hashed_text.encode('utf-8'))
        