# Remembra - Supabase Backend Setup Guide

This guide will walk you through setting up the Supabase backend for Remembra.

## Prerequisites

- A Supabase account (free tier works fine)
- Your Supabase project URL and anon key

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Fill in:
   - **Name**: `remembra` (or any name you prefer)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest to your users
4. Click **"Create new project"**
5. Wait for the project to be provisioned (takes 1-2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (the long string under "Project API keys")

## Step 3: Configure Environment Variables

1. In your app directory, copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 4: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste it into the SQL editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)

You should see a success message. If there are any errors, they will be displayed in the results panel.

### Alternative: Run Schema in Sections

If you encounter errors, run the schema in sections (each section is marked in the SQL file):

1. **Section 1**: Extensions
2. **Section 2**: Enums (custom types)
3. **Section 3**: Tables
4. **Section 4**: Indexes
5. **Section 5**: Row Level Security policies
6. **Section 6**: Functions and triggers

## Step 5: Enable Authentication

### Email/Password Auth (Required)

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Configure settings:
   - **Confirm email**: Enable or disable based on your preference
   - **Secure email change**: Recommended to enable

### OAuth Providers (Optional)

To enable Google, GitHub, or Discord login:

1. Go to **Authentication** → **Providers**
2. Click on the provider you want to enable
3. Follow the provider-specific setup instructions:

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret to Supabase

#### GitHub OAuth
1. Go to GitHub → Settings → Developer Settings → OAuth Apps
2. Create new OAuth app
3. Set callback URL: `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret to Supabase

#### Discord OAuth
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create new application
3. Go to OAuth2 → Add redirect: `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret to Supabase

## Step 6: Configure Site URL

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your app URL:
   - Development: `http://localhost:5173`
   - Production: Your deployed app URL
3. Add **Redirect URLs**:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:5173/**`
   - Your production URLs

## Step 7: Set Up Storage (Optional)

For file attachments:

1. Go to **Storage** → **New bucket**
2. Create bucket named `attachments`
3. Set to **Private** (not public)
4. Go to **Policies** tab
5. Add the following policies (or run the commented SQL in schema.sql):

```sql
-- Allow users to upload to their own folder
CREATE POLICY "Users can upload own attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own attachments
CREATE POLICY "Users can view own attachments"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 8: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open the app in your browser
3. The app will work in "demo mode" with mock data until you sign up/sign in
4. Create a new account to test authentication
5. Once signed in, all data will be synced with Supabase

## Verification Checklist

- [ ] Environment variables are set correctly
- [ ] Database schema is created (check Tables in Supabase dashboard)
- [ ] RLS policies are enabled (green shield icon on tables)
- [ ] Authentication is configured
- [ ] Site URLs are set correctly
- [ ] Test user can sign up and sign in

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure you've created `.env` file in the `app` directory
- Ensure the values don't have quotes around them
- Restart the dev server after adding env vars

### "new row violates row-level security policy"
- Check that RLS policies are created correctly
- Ensure the user is authenticated before making requests

### Profile not created on signup
- Check if the `handle_new_user` trigger exists
- Go to Database → Triggers to verify

### Authentication not working
- Check URL Configuration in Supabase
- Ensure Site URL matches your app URL exactly
- Check browser console for specific error messages

## Database Schema Overview

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (extends auth.users) |
| `categories` | Learning categories/folders |
| `memory_items` | Flash cards / learning content |
| `reviews` | Individual review sessions |
| `streak_entries` | Daily streak tracking |
| `achievements` | User achievements/badges |

## Next Steps

- Customize default categories in `categoryService.ts`
- Customize achievements in `achievementService.ts`
- Add AI integration for summaries/flowcharts
- Set up edge functions for advanced features

## Support

For issues with this setup, check:
1. Supabase documentation: https://supabase.com/docs
2. This project's issues page
3. Supabase Discord community
