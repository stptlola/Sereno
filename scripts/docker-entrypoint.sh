#!/bin/sh
# Démarrage du conteneur : migrations, modèle de tâches, puis serveur.
set -e

echo "Sereno · application des migrations de la base…"
prisma migrate deploy --schema=./prisma/schema.prisma

echo "Sereno · mise à jour du modèle de tâches…"
node prisma/seed.mjs

echo "Sereno · démarrage du serveur sur le port ${PORT:-3000}"
exec node server.js
