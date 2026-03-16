import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ─── CONFIGURACIÓN DE SUPABASE ───
// TODO: El usuario debe reemplazar estos valores con los de su proyecto de Supabase
const SUPABASE_URL = 'https://rlmnsygrkavehptqcvcl.supabase.co'; 
const SUPABASE_ANON_KEY = 'TU_KEY_ANON_DE_SUPABASE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };
