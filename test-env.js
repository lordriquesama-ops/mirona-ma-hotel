// Test environment variable loading
console.log('🔍 Testing environment loading...');

// Test direct import.meta access
console.log('import.meta:', import.meta);

// Test environment access
console.log('VITE_SUPABASE_URL:', import.meta.env?.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env?.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('VITE_USE_SUPABASE:', import.meta.env?.VITE_USE_SUPABASE);

// Test if window.location works
console.log('Current URL:', window.location.href);

// Test if Vite env is working
console.log('Vite env mode:', import.meta.env.MODE);
