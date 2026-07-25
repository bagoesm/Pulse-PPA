import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, name, role, divisi');
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  console.log('Registered User Profiles:');
  console.log(JSON.stringify(profiles, null, 2));
}

main();
