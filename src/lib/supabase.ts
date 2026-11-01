import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yaqrwtxlkuhfkdgwumda.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_MdfwkaA3vNzvRfjHf5wGtQ_TqOvEpzm';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

