import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ─── CONFIGURACIÓN DE SUPABASE ───
// TODO: El usuario debe reemplazar estos valores con los de su proyecto de Supabase
const SUPABASE_URL = 'https://rlmnsygrkavehptqcvcl.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_vyUYuWclgq8hWyi3oBIGUQ_4zrlJxli';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };
