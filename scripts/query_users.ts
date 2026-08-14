import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function main() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, name, profile_photo, profile_photo_path');
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  console.log('Registered User Profiles:');
  console.log(JSON.stringify(profiles, null, 2));
}

main();
