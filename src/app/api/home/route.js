import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  const { data, error } = await supabase.from('waiver').select('*');

  if (error) {
    console.error('Supabase error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
