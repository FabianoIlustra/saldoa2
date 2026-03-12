/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Colocamos os valores fixos. Se o sistema não achar a variável de ambiente,
// ele usa o que está depois do "||" automaticamente.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://chftbepwsjgzfahdvjmp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZnRiZXB3c2pnemZhaGR2am1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODAxMTAsImV4cCI6MjA4Nzk1NjExMH0.lOQVnTip-aSsMSIfm0Z-n1cVgUyG37tePxDR_S67hpc';

// REMOVEMOS O "if (throw new Error)" QUE ESTÁ TRAVANDO O SITE
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configuração Gemini
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAYr7-hLZLNHKpPodoohXfaKjxlLE-F9OI';
export const genAI = new GoogleGenerativeAI(geminiKey);
