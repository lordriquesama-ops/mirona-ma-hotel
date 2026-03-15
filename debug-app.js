// Debug script to check what's failing
console.log('🔍 Debugging app startup...');

// Check environment variables
console.log('📊 Environment Variables:');
console.log('VITE_SUPABASE_URL:', import.meta.env?.VITE_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('VITE_USE_SUPABASE:', import.meta.env?.VITE_USE_SUPABASE ? 'SET' : 'NOT SET');

// Check if Supabase client loads
try {
  const { supabase } = await import('./services/supabase.js');
  console.log('✅ Supabase client loaded');
} catch (error) {
  console.error('❌ Supabase client failed:', error.message);
}

// Check if app component loads
try {
  const App = await import('./App.tsx');
  console.log('✅ App component loaded');
} catch (error) {
  console.error('❌ App component failed:', error.message);
}

console.log('🔍 Debug complete');
