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
const supabaseUrl = "https://pnamzbzuqqeyjotswxbd.supabase.co";

// PŘÍKLAD: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi..."
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuYW16Ynp1cXFleWpvdHN3eGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzA0NzYsImV4cCI6MjA3MzUwNjQ3Nn0.M_7RLVc0gHG3VeeSzvQ3f4Vw0ftWbj68Ww15DF65PYs";


// Kontrola, zda byly klíče vyplněny.
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('!!! SEM VLOŽTE')) {
    // Zobrazíme chybu přímo v aplikaci, pokud klíče chybí.
    const rootElement = document.getElementById('root');
    if (rootElement) {
        rootElement.innerHTML = `
            <div style="font-family: sans-serif; padding: 2rem; text-align: center; background-color: #FFFBEB; border: 1px solid #FBBF24; border-radius: 0.5rem; margin: 2rem;">
                <h1 style="font-size: 1.5rem; font-weight: bold; color: #92400E;">Chyba v konfiguraci</h1>
                <p style="margin-top: 1rem; color: #B45309;">
                    Nebyly nalezeny platné klíče pro připojení k Supabase.
                </p>
                <p style="margin-top: 0.5rem; color: #B45309;">
                    Prosím, otevřete soubor <strong>services/supabaseClient.ts</strong> a nastavte správné hodnoty pro 
                    <code>supabaseUrl</code> a <code>supabaseAnonKey</code>.
                </p>
            </div>
        `;
    }
    // Zastavíme provádění, aby se zabránilo dalším chybám.
    throw new Error("Supabase URL and Anon Key are required. Please set them in services/supabaseClient.ts");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
