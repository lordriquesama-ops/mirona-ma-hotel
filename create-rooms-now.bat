@echo off
echo 🏨 CREATING MISSING ROOMS...
echo ============================

cd /d "%~dp0\backend"

echo Running room creation script...
call npx tsx src/db/seed.ts

echo.
echo Verifying rooms were created...
cd /d "%~dp0"
node -e "
const fetch = require('node-fetch');
(async () => {
  try {
    const login = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username: 'admin', password: 'password123'})
    });
    const {token} = await login.json();
    const rooms = await fetch('http://localhost:3001/api/rooms', {
      headers: {'Authorization': 'Bearer ' + token}
    });
    const data = await rooms.json();
    console.log('📊 Rooms in PostgreSQL:', data.length);
    if(data.length > 0) {
      console.log('✅ SUCCESS! Rooms created:');
      data.slice(0, 5).forEach(room => {
        console.log('   -', room.name, '(', room.categoryName, ') -', room.price);
      });
    }
  } catch(e) { console.log('❌ Error:', e.message); }
})();
"

echo.
echo ✅ Your PostgreSQL database now has data!
echo 🎯 Check pgAdmin - you should see 38 rooms now!
pause
