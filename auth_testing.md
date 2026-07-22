# Auth Testing — BMW Momentum Showroom
Admin: alainpali4@gmail.com / BMWmomentum2026 (role admin)
Auth uses httpOnly cookies (access_token, refresh_token), samesite=none, secure=true.
Endpoints: POST /api/auth/{register,login,logout,refresh}, GET /api/auth/me
Use a cookie jar. Login sets cookies; /me returns same user via cookies.
