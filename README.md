# Zizany (T-JSF-600-TLS1)

Real Time Chat application with NodeJS + ExpressJS, and a client in NextJS.

## Project overview

## High-level architecture

## Layers & responsibilities

### UX layer (NextJS)

Afficher, capter les actions, orchestrer les appels.
Ce qu'il fait :
- UI
- state front (serveurs ouverts, channels actifs)
- appels REST (CRUD) + connexion Socket (temps réel)
- gestion token côté client (stockage + refresh)

Ce qu'il ne fait pas :
- règles de permissions
- logique "Owner unique"
- accès DB (no way)

### Transport layer (REST & Socket.IO)

Traduire le monde extérieur vers l'appli.

#### REST Controllers (Express)

Ce qu'il fait :
- parse / validate (DTO)
- auth middleware (vérifier JWT)
- appeler un service
- renvoyer codes HTTP + format d'erreur

Ce qu'il ne fait pas :
- règles métier
- SQL/DB direct

#### Socket Gateway (Socket.IO)

Ce qu'il fait :
- auth à la connexion (JWT)
- join/leave rooms
- recevoir events
- déléguer aux services
- émettre les events

Ce qu'il ne fait pas :
- persistance directe
- permissions métier

### Business logic layer (Services)

Ce qu'il fait :
- permissions & rôles
- invariants (Owner unique, Owner cannot leave, etc.)
- orchestration: plusieurs repos, validations métier
- déclenchement d'events

Ce qu'il ne fait pas :
- manipuler req/res
- connaître Socket.IO ou Express
- connaître SQL concret

### Data access layer (Repositories)

Ce qu'il fait :
- requêtes DB (SQL/ODM)
- mapping DB -> objets (records)
- transactions si besoin
- pagination

Il s'agît d'une abstraction de la base de données, nécessaire pour accéder aux données de la DB pour les interpréter, les standardiser et les rendre utilisable par les back layers. La raison d'être de cet intermédiaire est de rendre le projet testable sans DB et de permettre son évolutivité.

### Database

PostgreSQL
- Tables / collections + relations
- index
- contraintes basiques

## Functional modules

## Data persistence & database choice

## Real-time architecture

## Testing strategy

## Scalability & evolvability

## How to run