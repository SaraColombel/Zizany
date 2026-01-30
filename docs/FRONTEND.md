## Structure de dossier :
    - src/app : Pages and routing NextJS
    - src/components : Components React
    - src/components/ui : Components shadcn/ui
    - src/lib : Utilities (API, helpers, etc)

## API usage (frontend) :

### Authentication
    - POST /auth/login - in progress
    - POST /auth/signup - in progress
    - POST /auth/logout - planned
    - GET /me - planned


### Servers
    - POST /servers - planned
    - GET /servers - done
    - GET /servers/{id} - done
    - PUT /servers/{id} - planned
    - DELETE /servers/{id} - planned
    - POST /servers/{id}/join - planned
    - DELETE /servers/{id}/leave - planned
    - GET /servers/{id}/members - planned
    - PUT /servers/{id}/members/:userId - planned


### Channels
    - POST /servers/{serverId}/channels - planned
    - GET /servers/{serverId}/channels - done
    - GET /channels/{id} - done
    - PUT /channels/{id} - planned
    - DELETE /channels/{id} - planned


### Messages
    - POST /channels/{id}/messages - done
    - GET /channels/{id}/messages - done
    - DELETE /messages/{id} - done


### Real-time (WebSocket/SSE)
    - WS /ws - planned