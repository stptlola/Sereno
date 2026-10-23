# Déploiement de Sereno

Sereno se déploie comme un seul conteneur Docker (l'application Next.js) relié à une base PostgreSQL. Ce guide décrit le déploiement avec [Coolify](https://coolify.io), puis le développement en local.

## Ce qu'il faut avant de commencer

- Un serveur avec Coolify installé (2 Go de RAM minimum, 4 Go conseillés pour construire l'image sur place).
- Un nom de domaine pointant vers ce serveur, par exemple `app.sereno.fr`.
- L'accès au dépôt GitHub `stptlola/Sereno` depuis Coolify (application GitHub ou clé de déploiement).
- Un compte d'envoi d'e-mails SMTP (Brevo, Postmark, Scaleway TEM…) hébergé en Europe de préférence, pour le RGPD.

## Ce que fait le conteneur au démarrage

1. Il vérifie les variables d'environnement : s'il en manque une obligatoire, il s'arrête et l'indique dans les logs (« Configuration invalide »).
2. Il applique les migrations de la base (`prisma migrate deploy`).
3. Il charge ou met à jour le modèle de tâches (131 tâches, sans doublon, quel que soit le nombre de redémarrages).
4. Il démarre le serveur sur le port **3000**.

La route `GET /api/health` renvoie `200` quand l'application et la base répondent, `503` sinon. C'est elle qu'utilisent le healthcheck Docker et Coolify.

## Variables d'environnement

| Variable | Obligatoire | Exemple | Rôle |
| --- | --- | --- | --- |
| `DATABASE_URL` | Oui | `postgresql://sereno:motdepasse@db:5432/sereno` | Connexion à PostgreSQL. Avec la base Coolify, copier l'« URL interne » de la ressource. |
| `APP_URL` | Oui | `https://app.sereno.fr` | Adresse publique de l'application, sans barre finale. Sert aux liens des e-mails et à l'authentification. |
| `AUTH_SECRET` | Oui | (64 caractères aléatoires) | Secret de signature des sessions, 32 caractères minimum. Générer avec `openssl rand -base64 32`. Ne jamais le changer en production : toutes les sessions seraient perdues. |
| `SMTP_HOST` | En production | `smtp-relay.brevo.com` | Serveur d'envoi des e-mails (confirmation, mot de passe oublié, rappels). |
| `SMTP_PORT` | Non (587) | `587` | Port SMTP. |
| `SMTP_USER` | En production | `bonjour@sereno.fr` | Identifiant SMTP. |
| `SMTP_PASSWORD` | En production | (clé SMTP) | Mot de passe ou clé SMTP. |
| `MAIL_FROM` | Non | `Sereno <bonjour@sereno.fr>` | Expéditeur des e-mails ; le domaine doit être validé chez le fournisseur SMTP (SPF, DKIM). |
| `GOOGLE_CLIENT_ID` | Non | `…apps.googleusercontent.com` | Connexion avec Google (ticket M0-02). |
| `GOOGLE_CLIENT_SECRET` | Non | (secret Google) | Idem. |
| `APPLE_CLIENT_ID` | Non | `fr.sereno.web` | Connexion avec Apple (ticket M0-02). |
| `APPLE_CLIENT_SECRET` | Non | (secret Apple) | Idem. |
| `TZ` | Non (Europe/Paris) | `Europe/Paris` | Fuseau horaire du conteneur, déjà réglé dans l'image. |

Pour l'option Docker Compose ci-dessous, trois variables servent en plus à créer la base : `POSTGRES_USER` (défaut `sereno`), `POSTGRES_PASSWORD` (obligatoire) et `POSTGRES_DB` (défaut `sereno`). `DATABASE_URL` est alors construite automatiquement.

Les variables SMTP et de connexion Google ou Apple deviendront obligatoires au fur et à mesure que les tickets correspondants seront livrés ; ce tableau sera tenu à jour.

## Option A (conseillée) : application Dockerfile et base PostgreSQL Coolify

C'est la plus simple à sauvegarder et à mettre à jour, car Coolify gère la base comme une ressource à part.

1. **Créer la base.** Dans le projet Coolify : *New resource → Database → PostgreSQL 17*. Laisser Coolify générer le mot de passe, démarrer la base, puis copier son **URL interne** (« Postgres URL (internal) »).
2. **Créer l'application.** *New resource → Application*, choisir le dépôt `stptlola/Sereno`, branche `main`, et le *Build Pack* **Dockerfile** (le fichier est à la racine).
3. **Réglages réseau.** *Ports Exposes* : `3000`. Renseigner le domaine, par exemple `https://app.sereno.fr` : Coolify génère le certificat HTTPS.
4. **Variables.** Dans *Environment Variables*, ajouter au minimum `DATABASE_URL` (l'URL interne copiée à l'étape 1), `APP_URL` et `AUTH_SECRET`, puis les variables SMTP.
5. **Healthcheck.** Dans *Healthcheck*, activer la vérification avec le chemin `/api/health` et le port `3000`.
6. **Déployer.** Cliquer sur *Deploy*. La première construction prend quelques minutes ; les logs montrent ensuite « application des migrations », « mise à jour du modèle de tâches » puis « démarrage du serveur ».
7. **Déploiement automatique.** Activer *Auto Deploy* pour redéployer à chaque `git push` sur `main`.

## Option B : tout-en-un avec Docker Compose

Le fichier `docker-compose.yml` décrit l'application et sa base. Dans Coolify, choisir le *Build Pack* **Docker Compose**, puis :

1. Renseigner les variables `POSTGRES_PASSWORD`, `APP_URL` et `AUTH_SECRET` (et SMTP) dans l'interface : Coolify les détecte à partir du fichier.
2. Associer le domaine au service `app`, port `3000`.
3. Déployer. Les données de la base sont conservées dans le volume `sereno-db`.

Le même fichier fonctionne sur n'importe quel serveur Docker : créer un fichier `.env` avec ces variables, puis `docker compose up -d --build`.

## Sauvegardes

- **Option A** : dans la ressource PostgreSQL de Coolify, onglet *Backups*, planifier une sauvegarde quotidienne et l'envoyer vers un stockage S3 hébergé en Europe.
- **Option B** : sauvegarder le volume `sereno-db`, par exemple avec `docker compose exec db pg_dump -U sereno sereno > sauvegarde.sql` dans une tâche planifiée.
- Tester une restauration au moins une fois avant l'ouverture aux premiers couples.

## Mettre à jour et revenir en arrière

- Chaque `git push` sur `main` redéploie l'application ; les migrations s'appliquent automatiquement au démarrage.
- Pour revenir en arrière, redéployer un commit précédent depuis l'historique des déploiements de Coolify. Attention : une migration déjà appliquée n'est pas annulée ; les migrations doivent donc rester compatibles avec la version précédente du code (ajouter des colonnes plutôt qu'en supprimer).

## Développement en local

Prérequis : Node.js 22, Docker.

```bash
cp .env.example .env                       # puis renseigner AUTH_SECRET
docker compose -f compose.dev.yml up -d    # base PostgreSQL et boîte mail de test
npm ci
npm run db:deploy                          # crée les tables
npm run db:seed                            # charge les 131 tâches
npm run dev                                # http://localhost:3000
```

Les e-mails envoyés en local arrivent dans Mailpit : <http://localhost:8025>.

Commandes utiles : `npm test` (tests), `npm run typecheck` (types), `npm run db:migrate` (nouvelle migration après une modification de `prisma/schema.prisma`), `npm run db:studio` (explorer la base).

## En cas de problème

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| Le conteneur s'arrête aussitôt avec « Configuration invalide » | Variable obligatoire manquante ou mal formée | Lire la liste affichée dans les logs et compléter les variables. |
| `/api/health` renvoie 503 | Base injoignable | Vérifier `DATABASE_URL` (URL **interne**) et que la base tourne. |
| « P3009 » ou « migrate found failed migrations » | Une migration a échoué à moitié | Corriger, puis `prisma migrate resolve` depuis le terminal du conteneur, en suivant le message affiché. |
| La construction échoue faute de mémoire | Serveur trop petit | Passer à 4 Go de RAM, ou construire l'image ailleurs (GitHub Actions) et la déployer depuis un registre. |
