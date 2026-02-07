# Supabase Configuration Quick Guide

## Disable Email Confirmation

To allow users to sign in immediately without verifying their email:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. In the left sidebar, navigate to: **Authentication** → **Settings**
4. Scroll down to the **"Email Auth"** section
5. Find the toggle for **"Enable email confirmations"**
6. Toggle it **OFF** (disable it)
7. Click **"Save"** at the bottom of the page

✅ **Done!** Users can now sign up and sign in immediately without email verification.

## Optional: Configure Email Templates

If you want to customize the email templates for password resets or other notifications:

1. Go to **Authentication** → **Email Templates**
2. You'll find templates for:
   - Confirm signup
   - Reset password
   - Magic Link
   - Change email address
   - Invite user

3. Customize the HTML templates with your branding
4. Use the variables provided (like `{{ .ConfirmationURL }}`)

## Email Provider Settings

By default, Supabase uses their development SMTP server (limited to 3 emails per hour).

For production, you should set up a custom SMTP provider:

1. Go to **Settings** → **Project Settings** → **Auth**
2. Scroll to **"SMTP Settings"**
3. Configure your SMTP provider (SendGrid, Mailgun, AWS SES, etc.)

Example with SendGrid:
- Host: `smtp.sendgrid.net`
- Port: `587`
- Username: `apikey`
- Password: `YOUR_SENDGRID_API_KEY`
- Sender email: `noreply@yourdomain.com`
- Sender name: `Remembra`

## Security Note

⚠️ **Important**: Disabling email confirmation makes your app less secure because:
- Anyone can sign up with any email address (even if they don't own it)
- No verification that the email is valid

**Recommended**: Only disable email confirmation if:
- You're in development/testing
- You have other verification mechanisms
- Your app doesn't require high security

For production apps, it's better to keep email confirmation enabled.

## Alternative: Magic Link Sign-In

Instead of disabling email confirmation, you can enable Magic Link authentication:

1. Go to **Authentication** → **Settings**
2. Enable **"Enable email OTP"**
3. Update your Auth.tsx to use `supabase.auth.signInWithOtp({ email })`

This provides security without requiring passwords.
