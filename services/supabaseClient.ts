/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// ===================================================================
// === FINÁLNÍ OPRAVA: PŘIPOJENÍ K DATABÁZI (SUPABASE) ===
// ===================================================================
//
// Aby se aplikace mohla spolehlivě připojit k vaší databázi na všech
// zařízeních, vložte vaše unikátní klíče přímo sem. Tímto odstraníme
// problém s časováním načítání, který způsoboval chyby na mobilu.
//
// POSTUP:
// 1. Přihlaste se do vašeho projektu na app.supabase.com
// 2. Jděte do "Project Settings" (ozubené kolečko) -> "API".
// 3. Zkopírujte "Project URL" a vložte ji místo placeholderu níže.
// 4. Zkopírujte "anon" "public" klíč a vložte ho místo placeholderu níže.
//
// ===================================================================

// PŘÍKLAD: "https://abcdefghijkl.supabase.co"
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


// Kontrola, zda byly klíče vyplněny.
if (!supabaseUrl || !supabaseAnonKey) {
    // Vyhodíme chybu, kterou odchytí Error Boundary v Reactu.
    // Tím zabráníme pádu celé aplikace a zobrazíme uživateli nápovědu.
    throw new Error("Supabase URL and Anon Key are required. Please set them in your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);