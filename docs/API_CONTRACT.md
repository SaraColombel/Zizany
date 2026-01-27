# Authentication

## [ ] GET /me
Status : planned
Retrieve the currently authenticated user.

### Expected reponse :
- 200 OK
```json
{
  "id": "string",
  "email": "string"
}
```
- 401 Unauthorized


## [X] POST /login
Status : implemented
Authenticate a user and start a session.

### Request body :
```json
{
    "email": "user@example.com",
    "password": "string"
}
```

### Responses :
- 200 OK : session cookie set
- 401 Unauthorised :
```json
{
    "message": "Invalid credentials"
}
```


## [ ] POST /register
Status : planned
Create a new user account.
