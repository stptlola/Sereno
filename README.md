# Sereno

**Votre mariage, l’esprit léger.**

Sereno accompagne pas à pas les couples qui organisent leur mariage eux-mêmes, pour une fraction du prix d’un wedding planner : planning qui s’adapte à la date, budget, invités, réponses en ligne, plan de table, jour J… sans publicité ni démarchage.

## Documents de référence

- [Cahier des charges, spécifications et analyse concurrentielle](https://claude.ai/code/artifact/23a54871-9f09-4049-8e8c-49483d7a331a)
- [Livre de marque Sereno](https://claude.ai/artifact/5BKVGhopzhj6TmZZyiimN7)

## Tickets

159 tickets, dont 53 pour le MVP, 35 pour la V2, 69 pour la V3 et 2 pour la V4 : voir [`tickets/`](tickets/README.md) et l’onglet **Issues** du dépôt.

## Pile technique prévue

- Next.js (React) en TypeScript, mobile-first et installable (PWA)
- Node.js côté serveur, via Next.js
- PostgreSQL, hébergement en Europe
- Stripe pour le paiement du Pass

## Créer les issues GitHub

Les 159 tickets sont prêts à devenir des issues, avec étiquettes de version et de module et un jalon par version :

```bash
GITHUB_TOKEN=votre_jeton python3 scripts/creer-issues.py
```

Le jeton doit avoir le droit « Issues : lecture et écriture » sur ce dépôt.
