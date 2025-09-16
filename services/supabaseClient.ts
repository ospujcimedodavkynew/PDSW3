import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (window as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (window as any).env.VITE_SUPABASE_ANON_KEY;

// Robust check to see if the placeholder values are still present.
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('!!!') || supabaseAnonKey.includes('!!!')) {
    const errorDiv = document.getElementById('root');
    if(errorDiv) {
        errorDiv.innerHTML = `
            <div style="font-family: sans-serif; padding: 2rem; text-align: center; background-color: #FFFBEB; border: 1px solid #FBBF24; border-radius: 0.5rem; margin: 2rem;">
                <h1 style="font-size: 1.5rem; font-weight: bold; color: #92400E;">Chyba v konfiguraci</h1>
                <p style="margin-top: 1rem; color: #B45309;">
                    Nebyly nalezeny platné klíče pro připojení k Supabase.
                </p>
                <p style="margin-top: 0.5rem; color: #B45309;">
                    Prosím, otevřete soubor <strong>index.html</strong> a nastavte správné hodnoty pro 
                    <code>VITE_SUPABASE_URL</code> a <code>VITE_SUPABASE_ANON_KEY</code>.
                </p>
            </div>
        `;
    }
    // This prevents the app from proceeding and calling createClient with invalid data, which causes a crash.
    throw new Error("Supabase URL and Anon Key are required. Make sure to set them in index.html");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
