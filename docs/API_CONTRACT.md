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


## [ ] POST /login
Status : in progress
Authenticate a user and start a session.
!! Check for error messages : Send from back, how do I display them ?
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
Status : in progress
Create a new user account.
!! Check for error messages : Send from back, how do I display them ?

