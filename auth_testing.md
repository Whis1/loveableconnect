# Auth Testing Playbook (Emergent OAuth)

This playbook explains how to test auth-gated routes for the Stelle dating app.

## Backend session model
Users authenticated via Google OAuth or email/password share the same session mechanism:
- collection `user_sessions` { session_token, user_id, created_at, expires_at }
- Session cookie name: `session_token` (httpOnly, secure, samesite=none, path=/)
- Backend reads cookie OR `Authorization: Bearer <session_token>` header

## Step 1: Seed a test user + session via mongosh
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Stella Test',
  picture: null,
  bio: 'utente di test',
  age: 28,
  gender: 'donna',
  city: 'Roma',
  interests: ['arte','musica'],
  photos: [],
  auth_provider: 'email',
  created_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  session_token: sessionToken,
  user_id: userId,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString()
});
print('TOKEN=' + sessionToken);
print('USER=' + userId);
"
```

## Step 2: Backend curl test
```
curl -s "$REACT_APP_BACKEND_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

## Step 3: Browser cookie test
```
await page.context.add_cookies([{
  "name": "session_token",
  "value": TOKEN,
  "domain": "<host without https>",
  "path": "/",
  "httpOnly": true,
  "secure": true,
  "sameSite": "None"
}])
await page.goto(REACT_APP_BACKEND_URL + "/dashboard")
```

## Cleanup
```
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /test\.user\./});
db.user_sessions.deleteMany({session_token: /test_session/});
"
```
