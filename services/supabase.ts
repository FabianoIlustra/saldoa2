/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Configuração do Supabase com Valores Fixos (Fallback)
// Se o Cloudflare não injetar a variável, o site usa o texto direto abaixo.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://chftbepwsjgzfahdvjmp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZnRiZXB3c2pnemZhaGR2am1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODAxMTAsImV4cCI6MjA4Nzk1NjExMH0.lOQVnTip-aSsMSIfm0Z-n1cVgUyG37tePxDR_S67hpc';

// IMPORTANTE: Removemos o "if (...) { throw new Error }" que travava o site
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Configuração do Gemini
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAYr7-hLZLNHKpPodoohXfaKjxlLE-F9OI';
export const genAI = new GoogleGenerativeAI(geminiKey);
