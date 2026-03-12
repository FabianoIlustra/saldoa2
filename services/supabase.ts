/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Colocamos os valores DIRETOS aqui. 
// Isso ignora o erro de "Missing variables" do console.
const supabaseUrl = 'https://chftbepwsjgzfahdvjmp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZnRiZXB3c2pnemZhaGR2am1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODAxMTAsImV4cCI6MjA4Nzk1NjExMH0.lOQVnTip-aSsMSIfm0Z-n1cVgUyG37tePxDR_S67hpc';

// 2. Criamos o cliente sem o "if/throw error"
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 3. Configuração do Gemini (usando a sua chave)
const geminiKey = 'AIzaSyAYr7-hLZLNHKpPodoohXfaKjxlLE-F9OI';
export const genAI = new GoogleGenerativeAI(geminiKey);
