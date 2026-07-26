import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wrwsjlydozfzejixofwm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ri-Jt8XuWTrnI1RCKuVdMQ_f4LARc7Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
