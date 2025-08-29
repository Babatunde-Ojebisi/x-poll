#!/usr/bin/env node

/**
 * This script checks if the required Supabase tables exist for the X-Poll application.
 * It helps verify that the database schema has been properly set up.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Supabase URL and anon key are required.');
  console.error('Make sure you have a .env.local file with the following variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=your-supabase-url');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tables that should exist in the database
const requiredTables = ['polls', 'poll_options', 'votes'];

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') { // PostgreSQL error code for undefined_table
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    return false;
  }
}

async function checkDatabaseSchema() {
  console.log('Checking Supabase database schema for X-Poll application...');
  console.log(`Supabase URL: ${supabaseUrl}`);
  
  const results = {};
  let allTablesExist = true;
  
  for (const table of requiredTables) {
    const exists = await checkTableExists(table);
    results[table] = exists;
    
    if (!exists) {
      allTablesExist = false;
    }
    
    console.log(`Table '${table}': ${exists ? '✅ Exists' : '❌ Missing'}`);
  }
  
  if (allTablesExist) {
    console.log('\n✅ All required tables exist! Your database schema is properly set up.');
  } else {
    console.log('\n❌ Some tables are missing. Please set up your database schema.');
    console.log('\nTo set up the database schema:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy the contents of the schema.sql file in the supabase directory');
    console.log('4. Paste it into the SQL Editor and run the query');
    console.log('\nAlternatively, you can use the Supabase CLI to apply the migration:');
    console.log('npx supabase db push');
  }
}

checkDatabaseSchema().catch(error => {
  console.error('Error checking database schema:', error);
  process.exit(1);
});