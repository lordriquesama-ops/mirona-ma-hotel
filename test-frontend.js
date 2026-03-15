// Simple test to check if frontend can start
console.log('🔍 Testing frontend startup...');

// Check if Vite is available
try {
  const { createServer } = await import('vite');
  console.log('✅ Vite module loaded successfully');
} catch (error) {
  console.error('❌ Vite module not found:', error.message);
  process.exit(1);
}

// Check if React is available
try {
  const React = await import('react');
  console.log('✅ React module loaded successfully');
} catch (error) {
  console.error('❌ React module not found:', error.message);
  process.exit(1);
}

// Check environment variables
console.log('📊 Environment variables:');
console.log('VITE_SUPABASE_URL:', import.meta.env?.VITE_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('VITE_USE_SUPABASE:', import.meta.env?.VITE_USE_SUPABASE ? 'SET' : 'NOT SET');

console.log('✅ Frontend test completed - all modules available');
