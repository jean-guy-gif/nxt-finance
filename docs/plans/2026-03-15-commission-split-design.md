# Proposition — Commissionnement collaborateur / réseau

**Date** : 2026-03-15
**Statut** : Proposition MVP+
**Priorité** : Première évolution après stabilisation MVP

---

## Besoin métier

Dans l'immobilier, une vente génère une commission brute qui est répartie entre :
1. Le **réseau** (franchise, groupement) — pourcentage prélevé en amont (si applicable)
2. L'**agence** — part conservée
3. Le **collaborateur** (négociateur, agent commercial, indépendant) — part reversée

La répartition varie :
- Selon le collaborateur (50/50, 60/40, 70/30...)
- Selon l'existence d'un réseau (certaines agences indépendantes n'en ont pas)
- Selon le type de transaction

Le montant brut entre en trésorerie, puis la part collaborateur en ressort via facture.

---

## Modèle de données proposé

### Table `collaborators`

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| agency_id | uuid FK | |
| full_name | text | Nom du collaborateur |
| email | text | nullable |
| status | enum('active','inactive') | |
| type | enum('salarie','agent_commercial','independant') | |
| default_split_rate | numeric(5,2) | Taux par défaut du collaborateur (ex: 50.00 = 50%) |
| created_at | timestamptz | |

### Table `commission_splits` (liée à une recette)

| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| revenue_id | uuid FK UNIQUE | 1 split par recette |
| collaborator_id | uuid FK | |
| gross_amount | numeric(12,2) | Commission brute (= revenue.amount) |
| network_rate | numeric(5,2) | % réseau (0 si pas de réseau) |
| network_amount | numeric(12,2) | Montant réseau (calculé) |
| agency_rate | numeric(5,2) | % agence après réseau |
| agency_amount | numeric(12,2) | Montant agence (calculé) |
| collaborator_rate | numeric(5,2) | % collaborateur après réseau |
| collaborator_amount | numeric(12,2) | Montant collaborateur (calculé) |
| created_at | timestamptz | |

### Ajout à `agencies.settings`

```json
{
  "network_name": "Century 21",
  "default_network_rate": 8.0,
  "has_network": true
}
```

### Ajout à la table `revenues`

| Colonne | Type | Notes |
|---|---|---|
| collaborator_id | uuid FK | nullable, référence collaborators |

---

## Logique de calcul

```
Entrées :
  - commission brute : 10 000 €
  - taux réseau : 8% (ou 0 si pas de réseau)
  - taux collaborateur : 50%

Calcul :
  1. Part réseau = 10 000 × 8% = 800 €
  2. Base de répartition = 10 000 - 800 = 9 200 €
  3. Part collaborateur = 9 200 × 50% = 4 600 €
  4. Part agence = 9 200 - 4 600 = 4 600 €

Vérification : 800 + 4 600 + 4 600 = 10 000 ✓
```

Pour un indépendant sans réseau :
```
  - commission brute : 10 000 €
  - taux réseau : 0%
  - taux collaborateur : 50%

  Part réseau = 0
  Part collaborateur = 5 000 €
  Part agence = 5 000 €
```

---

## Écrans proposés

### Paramètres > Collaborateurs (nouvel onglet)
- Liste des collaborateurs (nom, type, taux par défaut, statut)
- Création / modification d'un collaborateur
- Configuration réseau (nom, taux par défaut, actif/inactif)

### Formulaire recette (modification)
- Nouveau champ : "Collaborateur" (select, optionnel)
- Si collaborateur sélectionné → bloc de répartition affiché :
  - Commission brute (= montant principal, non modifiable)
  - Taux réseau (pré-rempli depuis settings, modifiable)
  - Taux collaborateur (pré-rempli depuis le profil collaborateur, modifiable)
  - Calcul en temps réel : part réseau / agence / collaborateur
  - Bouton "Enregistrer la répartition"

### Dashboard (impact)
- La trésorerie visible devra être ajustée :
  - Trésorerie = encaissements − dépenses validées − **parts collaborateurs à reverser**
  - Ou a minima un indicateur séparé "parts à reverser"

### Recette détail (modification)
- Bloc "Répartition" visible si un collaborateur est lié
- Affiche les 3 parts avec montants calculés
- Mention "Part collaborateur à reverser" clairement identifiée

---

## Impact sur la trésorerie

Deux approches possibles :

**A) Déduction automatique** : la trésorerie visible déduit les parts collaborateurs non encore reversées.
→ Plus juste mais plus complexe (nécessite un suivi du reversement)

**B) Indicateur séparé** : la trésorerie reste "encaissements − dépenses", mais un KPI "À reverser aux collaborateurs" est affiché à côté.
→ Plus simple, plus transparent, recommandé pour le MVP+

**Recommandation : option B** pour la première version.

---

## Priorité d'implémentation

1. Table `collaborators` + CRUD dans Paramètres
2. Table `commission_splits` + logique de calcul
3. Champ collaborateur dans le formulaire recette
4. Bloc répartition dans le détail recette
5. KPI "À reverser" dans le dashboard
6. Ajustement trésorerie (option B)
