import { createClient } from '@supabase/supabase-js';

import {PUBLIC_SUPABASE_URL as SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY as SUPABASE_ANON_KEY} from './public-supabase-config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// This endpoint exposes only public provider-enable flags; no OAuth secrets.
export async function isGoogleSignInReady(): Promise<boolean> {
  try {
    const response = await fetch(SUPABASE_URL + '/auth/v1/settings', {
      headers: { apikey: SUPABASE_ANON_KEY },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return false;
    const settings = await response.json();
    return settings?.external?.google === true;
  } catch { return false; }
}
