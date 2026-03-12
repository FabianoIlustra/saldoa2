/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Configuração Supabase - Usando fallback direto para evitar o erro de variáveis ausentes
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://chftbepwsjgzfahdvjmp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZnRiZXB3c2pnemZhaGR2am1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODAxMTAsImV4cCI6MjA4Nzk1NjExMH0.lOQVnTip-aSsMSIfm0Z-n1cVgUyG37tePxDR_S67hpc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configuração Gemini - Usando a chave que forneceu
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAYr7-hLZLNHKpPodoohXfaKjxlLE-F9OI';
export const genAI = new GoogleGenerativeAI(geminiKey);
