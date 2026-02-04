// Test Supabase connection
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vcgmyivrlppfiizaeydg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZ215aXZybHBwZmlpemFleWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODI2MDksImV4cCI6MjA4NTc1ODYwOX0._h5KuVW-i7AZohCqG8J07wmLibDLc9tYV7GzL_RGaoI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test 1: Check if we can connect
    const { data, error } = await supabase.from('profiles').select('count');
    
    if (error) {
      console.error('❌ Error connecting to Supabase:', error.message);
      console.error('Details:', error);
      
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('\n⚠️  The "profiles" table does not exist.');
        console.log('Please run the SQL schemas in your Supabase SQL Editor:');
        console.log('1. lib/schema_new.sql');
        console.log('2. lib/rpc_functions_new.sql');
      }
    } else {
      console.log('✅ Successfully connected to Supabase!');
      console.log('Result:', data);
    }
    
    // Test 2: Check auth
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('❌ Auth error:', authError);
    } else {
      console.log('✅ Auth system working. Current session:', session ? 'Active' : 'None');
    }
    
  } catch (err) {
    console.error('❌ Fatal error:', err);
  }
}

testConnection();
