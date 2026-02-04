// Check if all required tables and functions exist
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vcgmyivrlppfiizaeydg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZ215aXZybHBwZmlpemFleWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODI2MDksImV4cCI6MjA4NTc1ODYwOX0._h5KuVW-i7AZohCqG8J07wmLibDLc9tYV7GzL_RGaoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking Remembra database setup...\n');
  
  const tables = [
    'profiles',
    'categories', 
    'memory_items',
    'reviews',
    'ai_content',
    'notification_preferences'
  ];
  
  let allTablesExist = true;
  
  // Check each table
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('count').limit(0);
      
      if (error) {
        console.log(`❌ Table "${table}" - ${error.message}`);
        allTablesExist = false;
      } else {
        console.log(`✅ Table "${table}" exists`);
      }
    } catch (err) {
      console.log(`❌ Table "${table}" - ${err.message}`);
      allTablesExist = false;
    }
  }
  
  console.log('\n');
  
  if (!allTablesExist) {
    console.log('⚠️  Some tables are missing!');
    console.log('\n📋 To set up the database:');
    console.log('1. Go to your Supabase project: https://supabase.com/dashboard/project/vcgmyivrlppfiizaeydg');
    console.log('2. Click on "SQL Editor" in the left sidebar');
    console.log('3. Create a new query and paste the contents of lib/schema_new.sql');
    console.log('4. Run the query');
    console.log('5. Create another new query and paste the contents of lib/rpc_functions_new.sql');
    console.log('6. Run that query');
    console.log('\nSee SUPABASE_SETUP.md for detailed instructions.');
  } else {
    console.log('✅ All tables exist!');
    console.log('\n📱 Your database is ready. You can now:');
    console.log('1. Run: npx expo start');
    console.log('2. Sign up for a new account in the app');
    console.log('3. Start using Remembra!');
  }
}

checkDatabase();
