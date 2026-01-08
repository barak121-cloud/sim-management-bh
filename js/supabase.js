// Supabase Client Configuration
// Configuration is set via window.ENV in index.html

const SUPABASE_URL = (window.ENV && window.ENV.SUPABASE_URL) || '';
const SUPABASE_ANON_KEY = (window.ENV && window.ENV.SUPABASE_ANON_KEY) || '';

let supabase = null;

async function initSupabase() {
    if (supabase) return supabase;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Supabase credentials not configured. Using localStorage fallback.');
        return null;
    }

    // Load Supabase from CDN if not using Vite
    if (typeof window.supabase === 'undefined') {
        await loadSupabaseScript();
    }

    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
}

function loadSupabaseScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function getSupabase() {
    return supabase;
}

export { initSupabase, getSupabase, SUPABASE_URL, SUPABASE_ANON_KEY };
