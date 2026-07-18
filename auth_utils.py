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

import requests
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def hash_password(plain_text):
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_text.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def check_password(plain_text, hashed_text):
    try:
        return bcrypt.checkpw(plain_text.encode('utf-8'), hashed_text.encode('utf-8'))
    except Exception:
        return False

def send_email_smtp(to_email: str, subject: str, html_content: str):
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    if not smtp_email or not smtp_password:
        return False
        
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_email
        msg['To'] = to_email
        
        part = MIMEText(html_content, 'html')
        msg.attach(part)
        
        # Connect to Gmail SMTP (SSL on port 465)
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to_email, msg.as_string())
        print(f"[EMAIL SENDER] Successfully sent SMTP email to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL SENDER ERROR] SMTP failed: {e}")
        return False

def send_verification_email(email: str, code: str):
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        print(f"\n=======================================================")
        print(f"[EMAIL SIMULATION] To: {email}")
        print(f"[EMAIL SIMULATION] Verification Code: {code}")
        print(f"=======================================================\n")
        return False

    from_email = os.getenv("EMAIL_FROM", "onboarding@resend.dev")
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f1115; color: #e2e8f0; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 40px auto; background-color: #1a1d24; border-radius: 8px; border: 1px solid #2d3748; overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #1a202c 0%, #111318 100%); padding: 30px; text-align: center; border-bottom: 2px solid #d4af37; }}
        .content {{ padding: 40px; text-align: center; }}
        .content p {{ font-size: 16px; line-height: 1.6; color: #a0aec0; }}
        .otp-code {{ display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #d4af37; background-color: #0f1115; padding: 15px 30px; border-radius: 6px; border: 1px dashed #d4af37; margin: 30px 0; }}
        .footer {{ background-color: #111318; padding: 20px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #2d3748; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #d4af37; margin: 0; font-size: 28px; letter-spacing: 2px; text-align: center;">UNI-LEAGUE</h1>
        </div>
        <div class="content" style="text-align: center; padding: 40px;">
          <p style="font-size: 16px; line-height: 1.6; color: #a0aec0; margin: 0 0 20px 0;">Thank you for registering! Use the verification code below to verify your student email and link your account:</p>
          <div class="otp-code" style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #d4af37; background-color: #0f1115; padding: 15px 30px; border-radius: 6px; border: 1px dashed #d4af37; margin: 20px 0;">{code}</div>
          <p style="font-size: 14px; color: #718096; margin: 20px 0 0 0;">This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
        </div>
        <div style="background-color: #111318; padding: 20px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #2d3748;">
          &copy; 2026 Uni-League. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """
    
    # Try SMTP first if configured
    if os.getenv("SMTP_EMAIL") and os.getenv("SMTP_PASSWORD"):
        if send_email_smtp(email, "Verify your Uni-League Student Email", html_content):
            return True

    try:
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "from": from_email,
            "to": email,
            "subject": "Verify your Uni-League Student Email",
            "html": html_content
        }
        r = requests.post(url, json=data, headers=headers, timeout=5)
        if r.status_code in [200, 201]:
            print(f"[EMAIL SENDER] Successfully sent verification email to {email}")
            return True
        else:
            print(f"[EMAIL SENDER ERROR] Failed to send email via Resend: Status {r.status_code}, Response: {r.text}")
    except Exception as e:
        print(f"[EMAIL SENDER ERROR] Exception while sending email: {e}")
    return False

def send_password_reset_email(email: str, code: str):
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        print(f"\n=======================================================")
        print(f"[EMAIL SIMULATION] To: {email}")
        print(f"[EMAIL SIMULATION] Password Reset Code: {code}")
        print(f"=======================================================\n")
        return False

    from_email = os.getenv("EMAIL_FROM", "onboarding@resend.dev")
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f1115; color: #e2e8f0; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 40px auto; background-color: #1a1d24; border-radius: 8px; border: 1px solid #2d3748; overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #1a202c 0%, #111318 100%); padding: 30px; text-align: center; border-bottom: 2px solid #d4af37; }}
        .content {{ padding: 40px; text-align: center; }}
        .content p {{ font-size: 16px; line-height: 1.6; color: #a0aec0; }}
        .otp-code {{ display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #d4af37; background-color: #0f1115; padding: 15px 30px; border-radius: 6px; border: 1px dashed #d4af37; margin: 30px 0; }}
        .footer {{ background-color: #111318; padding: 20px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #2d3748; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #d4af37; margin: 0; font-size: 28px; letter-spacing: 2px; text-align: center;">UNI-LEAGUE</h1>
        </div>
        <div class="content" style="text-align: center; padding: 40px;">
          <p style="font-size: 16px; line-height: 1.6; color: #a0aec0; margin: 0 0 20px 0;">You have requested to reset your password. Use the verification code below to authorize the reset:</p>
          <div class="otp-code" style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #d4af37; background-color: #0f1115; padding: 15px 30px; border-radius: 6px; border: 1px dashed #d4af37; margin: 20px 0;">{code}</div>
          <p style="font-size: 14px; color: #718096; margin: 20px 0 0 0;">This code will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
        </div>
        <div style="background-color: #111318; padding: 20px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #2d3748;">
          &copy; 2026 Uni-League. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """
    
    # Try SMTP first if configured
    if os.getenv("SMTP_EMAIL") and os.getenv("SMTP_PASSWORD"):
        if send_email_smtp(email, "Uni-League Password Reset Authorization Code", html_content):
            return True

    try:
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "from": from_email,
            "to": email,
            "subject": "Uni-League Password Reset Authorization Code",
            "html": html_content
        }
        r = requests.post(url, json=data, headers=headers, timeout=5)
        if r.status_code in [200, 201]:
            print(f"[EMAIL SENDER] Successfully sent password reset email to {email}")
            return True
        else:
            print(f"[EMAIL SENDER ERROR] Failed to send email via Resend: Status {r.status_code}, Response: {r.text}")
    except Exception as e:
        print(f"[EMAIL SENDER ERROR] Exception while sending email: {e}")
    return False