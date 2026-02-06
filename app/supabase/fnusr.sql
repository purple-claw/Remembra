-- =====================================================
-- REMEMBRA DATABASE FIX - Run this in Supabase SQL Editor
-- =====================================================
-- This script fixes common issues with new user creation
-- Run ALL of this in your Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Drop and recreate the handle_new_user function with proper error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, avatar_url, streak_count, total_reviews)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        0,
        0
    )
    ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate key errors
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recreate the trigger (drop first to avoid errors)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 3. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. Fix RLS policies - Make sure profiles insert works for new users
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles" ON profiles
    FOR INSERT WITH CHECK (true);

-- 5. Fix any existing users without profiles
-- This creates profiles for any auth users that don't have one
INSERT INTO public.profiles (id, username, streak_count, total_reviews)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
    0,
    0
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 6. Verify the fix worked
SELECT 
    'Auth users' as type, 
    COUNT(*) as count 
FROM auth.users
UNION ALL
SELECT 
    'Profiles' as type, 
    COUNT(*) as count 
FROM public.profiles;

-- Done! You should see matching counts for auth users and profiles.
