# Sereno

**Votre mariage, l’esprit léger.**

Sereno accompagne pas à pas les couples qui organisent leur mariage eux-mêmes, pour une fraction du prix d’un wedding planner : planning qui s’adapte à la date, budget, invités, réponses en ligne, plan de table, jour J… sans publicité ni démarchage.

## Documents de référence

- [Cahier des charges, spécifications et analyse concurrentielle](https://claude.ai/code/artifact/23a54871-9f09-4049-8e8c-49483d7a331a)
- [Livre de marque Sereno](https://claude.ai/artifact/5BKVGhopzhj6TmZZyiimN7)

## Tickets

176 tickets, dont 62 pour le MVP, 39 pour la V2, 73 pour la V3 et 2 pour la V4 : voir [`tickets/`](tickets/README.md) et l’onglet **Issues** du dépôt.

## Pile technique

Next.js 16 et React 19 en TypeScript, PostgreSQL 17 avec Prisma, Tailwind CSS, déployé en conteneur Docker avec Coolify. Le détail et les choix sont dans le [cahier des charges technique](docs/CAHIER-DES-CHARGES-TECHNIQUE.md).

## Démarrer en local

```bash
cp .env.example .env                       # renseigner AUTH_SECRET
docker compose -f compose.dev.yml up -d    # base et boîte mail de test
npm ci && npm run db:deploy && npm run db:seed
npm run dev                                # http://localhost:3000
```

Tests : `npm test`. Déploiement en production : voir [`DEPLOIEMENT.md`](DEPLOIEMENT.md).
