# Supabase Database Setup Guide

This guide will help you set up the complete database schema for Remembra in your Supabase project.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A new or existing Supabase project

## Setup Steps

### Step 1: Access SQL Editor

1. Log in to your Supabase dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query** button

### Step 2: Run Database Schema

1. **Open the schema file**: Navigate to `lib/schema_new.sql` in your project
2. **Copy the entire contents** of `schema_new.sql`
3. **Paste into SQL Editor** in Supabase
4. **Click "Run"** (or press `Ctrl/Cmd + Enter`)

This creates:
- ✅ 6 database tables (profiles, categories, memory_items, reviews, ai_content, notification_preferences)
- ✅ Row Level Security (RLS) policies for all tables
- ✅ Automatic triggers for `updated_at` timestamps
- ✅ Auth trigger function `handle_new_user()` that creates a profile on signup
- ✅ Indexes for query optimization

**Expected Result**: You should see a success message like "Success. No rows returned"

### Step 3: Run RPC Functions

1. **Create a new query** in SQL Editor (click "New Query")
2. **Open the RPC functions file**: Navigate to `lib/rpc_functions_new.sql`
3. **Copy the entire contents** of `rpc_functions_new.sql`
4. **Paste into SQL Editor**
5. **Click "Run"**

This creates PostgreSQL functions for:
- ✅ `calculate_next_review_stage()` - Implements 1-4-7-30-90 spaced repetition algorithm
- ✅ `get_review_queue()` - Fetches items due for review
- ✅ `submit_review()` - Records review results and updates next review date
- ✅ `get_user_stats()` - Calculates user statistics
- ✅ `get_calendar_heatmap()` - Generates calendar heatmap data
- ✅ `get_study_insights()` - Provides study insights and recommendations

**Expected Result**: Success message indicating functions were created

### Step 4: Verify Installation

#### Check Tables
1. Go to **Table Editor** in Supabase sidebar
2. You should see these tables:
   - `profiles`
   - `categories`
   - `memory_items`
   - `reviews`
   - `ai_content`
   - `notification_preferences`

#### Check RLS Policies
1. Click on any table in Table Editor
2. Click **"RLS"** tab
3. Verify policies are enabled and present

#### Check Functions
1. Go to **Database** → **Functions** in sidebar
2. Verify these functions exist:
   - `calculate_next_review_stage`
   - `get_review_queue`
   - `submit_review`
   - `get_user_stats`
   - `get_calendar_heatmap`
   - `get_study_insights`

### Step 5: Test User Creation

1. Go to **Authentication** → **Users** in Supabase
2. Click **Add user** → **Create new user**
3. Enter an email and password
4. Go to **Table Editor** → **profiles**
5. Verify a profile was automatically created for the new user

## Schema Overview

### Tables Structure

```
profiles
├── id (uuid, FK to auth.users)
├── username (text, unique)
├── full_name (text)
├── avatar_url (text)
├── streak_count (integer)
├── last_review_date (date)
├── created_at (timestamp)
└── updated_at (timestamp)

categories
├── id (uuid)
├── user_id (uuid, FK to profiles)
├── name (text)
├── description (text)
├── color (text)
├── icon (text)
├── created_at (timestamp)
└── updated_at (timestamp)

memory_items
├── id (uuid)
├── user_id (uuid, FK to profiles)
├── category_id (uuid, FK to categories)
├── title (text)
├── content (text)
├── content_type (text: 'text', 'markdown', 'code', 'equation')
├── stage (integer: 0, 1, 4, 7, 30, 90+)
├── difficulty (numeric: 0.0-1.0)
├── last_reviewed (timestamp)
├── next_review_date (timestamp)
├── times_reviewed (integer)
├── times_correct (integer)
├── metadata (jsonb)
├── created_at (timestamp)
└── updated_at (timestamp)

reviews
├── id (uuid)
├── memory_item_id (uuid, FK to memory_items)
├── user_id (uuid, FK to profiles)
├── was_correct (boolean)
├── difficulty_rating (integer: 1-5)
├── time_taken (integer, seconds)
├── created_at (timestamp)
└── updated_at (timestamp)

ai_content
├── id (uuid)
├── memory_item_id (uuid, FK to memory_items)
├── user_id (uuid, FK to profiles)
├── content_type (text: 'summary', 'quiz', 'flashcards', 'flowchart')
├── content (jsonb)
├── provider (text: 'groq', 'cohere')
├── model (text)
├── created_at (timestamp)
└── updated_at (timestamp)

notification_preferences
├── id (uuid)
├── user_id (uuid, FK to profiles)
├── daily_reminder_enabled (boolean)
├── daily_reminder_time (time)
├── review_reminders_enabled (boolean)
├── review_reminder_advance (integer, hours)
├── achievement_notifications (boolean)
├── streak_notifications (boolean)
├── created_at (timestamp)
└── updated_at (timestamp)
```

### Key Features

1. **Spaced Repetition Algorithm (1-4-7-30-90)**
   - Items start at stage 0 (new)
   - Progress through stages: 1 → 4 → 7 → 30 → 90 days
   - Algorithm adjusts based on user performance

2. **Row Level Security (RLS)**
   - All tables have RLS enabled
   - Users can only access their own data
   - Multi-tenant safe by design

3. **Automatic Profile Creation**
   - Trigger automatically creates profile when user signs up
   - Uses auth.users id as primary key

4. **Performance Optimizations**
   - Indexes on foreign keys and frequently queried columns
   - Efficient RPC functions for complex queries

## Troubleshooting

### Error: "relation already exists"
- Some tables might already exist from previous setup
- Drop existing tables first or use a fresh project

### Error: "function already exists"
- Functions might exist from previous setup
- Drop functions or use `CREATE OR REPLACE FUNCTION`

### RLS Blocking Queries
- Verify RLS policies are correctly set up
- Check that `auth.uid()` matches the user_id in queries
- Test with authenticated users only

### Profile Not Created on Signup
- Check if trigger `on_auth_user_created` exists
- Verify it's attached to `auth.users` table
- Check Supabase logs for errors

## Next Steps

After database setup is complete:

1. **Update .env file** with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the app**:
   ```bash
   npx expo start
   ```

4. **Test authentication** by signing up a new user

5. **Verify data flow** by creating a memory item and reviewing it

## Support

For issues with Supabase setup:
- Check [Supabase Documentation](https://supabase.com/docs)
- Review SQL errors in Supabase SQL Editor
- Check Supabase logs in Dashboard → Logs

For app-specific issues:
- Review README.md for app setup
- Check TypeScript errors in terminal
- Verify environment variables are set correctly
