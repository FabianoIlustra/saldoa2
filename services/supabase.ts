/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Usamos os valores diretos aqui para garantir que o site carregue 
// mesmo que o Cloudflare falhe ao ler o ficheiro .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://chftbepwsjgzfahdvjmp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZnRiZXB3c2pnemZhaGR2am1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODAxMTAsImV4cCI6MjA4Nzk1NjExMH0.lOQVnTip-aSsMSIfm0Z-n1cVgUyG37tePxDR_S67hpc';
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAYr7-hLZLNHKpPodoohXfaKjxlLE-F9OI');
// Removemos o "if (throw error)" para o site não travar se a variável estiver vazia
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
