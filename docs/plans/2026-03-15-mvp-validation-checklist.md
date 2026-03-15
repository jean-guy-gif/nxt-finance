# NXT Finance MVP — Plan de validation

**Date** : 2026-03-15
**Objectif** : Valider le MVP avant premier test réel

---

## 1. CHECKLIST TEST FONCTIONNEL

### Auth & Session

- [ ] Login avec email/password réel → dashboard s'affiche
- [ ] Login démo → dashboard avec données simulées + bandeau démo visible
- [ ] Login échoué → message "Identifiants incorrects"
- [ ] Déconnexion → retour /login, stores vidés
- [ ] Refresh navigateur quand connecté → session maintenue, pas de redirect login
- [ ] Accès /recettes sans session → redirect /login
- [ ] Accès /login quand connecté → redirect /
- [ ] Multi-onglets : logout dans un onglet → les autres redirigent vers login
- [ ] Hydratation : user profile + agence active + rôle chargés correctement
- [ ] Agency switcher visible si multi-agences, caché sinon

### Dashboard

- [ ] KPIs affichent des montants cohérents avec les recettes/dépenses seedées
- [ ] CA = recettes validated + collected + transmitted
- [ ] Encaissements = recettes collected uniquement
- [ ] Dépenses = total TTC de la période (tous statuts)
- [ ] Trésorerie = cumul encaissements − cumul dépenses validées (toutes périodes)
- [ ] Alertes prioritaires s'affichent (top 5, triées critical > vigilance > info)
- [ ] Dismiss d'une alerte → elle disparaît, ne revient pas
- [ ] Pièces manquantes = nombre correct de dépenses sans justificatif
- [ ] TVA estimée affichée avec badge "Estimation"
- [ ] Navigation période (mois précédent/suivant) → KPIs se rechargent
- [ ] Sélecteur Mois/Trimestre/Année fonctionne sur desktop
- [ ] Tap sur le label de période cycle les vues sur mobile
- [ ] Actions rapides → liens fonctionnels vers les bons modules
- [ ] Badge notification (cloche) affiche le compteur non lu

### Recettes

- [ ] Liste affiche les recettes du mois sélectionné
- [ ] Filtre par statut fonctionne
- [ ] Filtre par type fonctionne
- [ ] Recherche par libellé fonctionne
- [ ] Clic sur une ligne → page détail
- [ ] Création recette → formulaire valide les champs requis
- [ ] Création recette → apparaît dans la liste après sauvegarde
- [ ] Modification recette → valeurs pré-remplies, sauvegarde OK
- [ ] Suppression recette (draft uniquement) → confirmation + disparition
- [ ] Suppression bloquée si statut ≠ draft
- [ ] Suppression bloquée en mode démo → dialog explicatif
- [ ] Pièces jointes section visible en détail (vide = "Les justificatifs pourront être rattachés")
- [ ] Mobile : MobileCardList visible, DataTable cachée
- [ ] Desktop : DataTable visible, MobileCardList cachée
- [ ] Empty state affiché si aucune recette

### Dépenses

- [ ] Liste affiche les dépenses du mois sélectionné
- [ ] Filtre par statut fonctionne
- [ ] Filtre par catégorie fonctionne
- [ ] Recherche par fournisseur fonctionne
- [ ] Création dépense → catégorie et mode de paiement via enums stricts
- [ ] Upload justificatif depuis la liste → pièce créée en orphelin
- [ ] Upload justificatif depuis le détail → pièce liée à la dépense
- [ ] ReceiptCard affiche : nom fichier, source, statut, données OCR (si seedées)
- [ ] ReceiptCard affiche les anomalies en jaune
- [ ] ReceiptCard affiche le % de confiance OCR
- [ ] Bouton "Voir" sur un receipt → ouvre l'URL signée (nécessite fichier réel dans Storage)
- [ ] Bouton "Détacher" → pièce devient orpheline
- [ ] Suppression dépense bloquée si statut ≠ draft
- [ ] Suppression dépense bloquée en mode démo
- [ ] Responsive : cards mobile OK

### Périodes & TVA

- [ ] Liste affiche toutes les périodes de l'agence
- [ ] Cards avec TVA snapshot : collectée / déductible / solde affiché
- [ ] Clic sur une carte → détail
- [ ] Détail : bloc TVA avec les 3 montants + date du snapshot
- [ ] Mention "Estimation préparatoire" visible
- [ ] Disclaimer "Ces montants sont des estimations [...] Consultez votre expert-comptable" visible
- [ ] Bouton "Recalculer" → met à jour les snapshots TVA
- [ ] Complétude : % affiché, stats correctes (dépenses, justificatifs, anomalies)
- [ ] Blockers affichés en AlertBanner si présents
- [ ] Bouton "Prête à transmettre" visible si pas de blockers
- [ ] Bouton "Prête à transmettre" absent si blockers présents
- [ ] Transition vers "Prête à transmettre" → confirmation
- [ ] Bouton "Marquer transmise" visible si statut = ready_to_transmit
- [ ] Transition vers "Transmise" → confirmation, boutons d'action disparaissent
- [ ] Bouton "Partager au cabinet" / "Retirer partage" fonctionne
- [ ] Période transmise → aucune action d'édition possible

### Espace comptable

- [ ] Stats affichées : demandes en attente, non résolus, périodes partagées, validations
- [ ] Onglet "Échanges" : liste tous les commentaires/demandes
- [ ] Filtre par type (commentaire, demande, validation, annotation)
- [ ] Filtre par état (en cours / résolu)
- [ ] Onglet "Demandes" : filtre automatique sur type=request
- [ ] Onglet "Périodes partagées" : affiche les périodes avec shared_with_accountant=true
- [ ] Bouton "Résoudre" sur un commentaire → passe à résolu
- [ ] Commentaire résolu affiché en opacité réduite
- [ ] Bouton "Bientôt disponible" pour invitation (pas de faux bouton actif)

### Paramètres

- [ ] Accès bloqué si le rôle n'est pas manager
- [ ] Onglet Agence : nom, SIRET, adresse modifiables, feedback "Enregistré"
- [ ] Onglet Utilisateurs : liste des membres avec rôle
- [ ] Changement de rôle d'un autre membre fonctionne
- [ ] Impossible de changer son propre rôle (affiche badge, pas de select)
- [ ] Panneau permissions comptable dépliable quand rôle = accountant
- [ ] 8 toggles de permissions fonctionnels
- [ ] Suppression d'un membre → confirmation + disparition
- [ ] Suppression bloquée en mode démo
- [ ] Onglet Seuils : seuil trésorerie, délai préparation, tolérance, fréquence modifiables
- [ ] Sauvegarde seuils → feedback "Enregistré"
- [ ] Mode démo : avertissement "les modifications seront réinitialisées"

### Alertes transverses

- [ ] Le moteur s'exécute au chargement du dashboard
- [ ] Alertes générées correspondent aux données (vérifier manuellement 2-3 règles)
- [ ] Pas de doublons d'alertes dans la DB après plusieurs rechargements
- [ ] Dismiss → alerte ne réapparaît pas au rechargement
- [ ] TVA déductible > collectée → alerte info (pas critique)

---

## 2. CHECKLIST SÉCURITÉ SUPABASE

### RLS (Row Level Security)

- [ ] Toutes les tables ont RLS activé (vérifier dans Supabase Dashboard > Database > Tables)
- [ ] Un user connecté ne peut SELECT que les données de ses agences
- [ ] Tester : créer un 2e user avec une autre agence, vérifier qu'il ne voit pas les données de la 1re agence
- [ ] Un user ne peut INSERT que dans ses agences
- [ ] Un user ne peut UPDATE que dans ses agences
- [ ] Aucune table n'a de policy qui autorise les opérations sans auth (pas de `anon` access)
- [ ] Vérifier que `user_profiles` est limité à son propre profil en lecture

### Auth

- [ ] Pas de service_role key exposée dans le frontend (vérifier .env.local → seulement anon key)
- [ ] Le middleware Next.js bloque les routes protégées sans session
- [ ] Les tokens d'auth ne sont pas stockés dans le code ou les commits
- [ ] .env.local est dans .gitignore

### Storage

- [ ] Le bucket `receipts` est privé (public = false)
- [ ] Les policies Storage limitent l'accès au dossier de l'agence du user
- [ ] Un user ne peut pas lister/lire les fichiers d'une autre agence
- [ ] Les signed URLs expirent (vérifier durée = 1h dans le code)
- [ ] Pas de fichier uploadé accessible sans signed URL

### Permissions cabinet

- [ ] Un comptable sans permission `read` ne peut pas consulter les données partagées
- [ ] Un comptable sans permission `comment` ne voit pas le formulaire d'ajout de commentaire
- [ ] Un comptable sans permission `validate_document` ne voit pas le type "Validation" dans le sélecteur
- [ ] Les permissions sont vérifiées côté UI (hook usePermissions) — note : la vérification RLS côté DB est par agence, pas par permission fine → acceptable au MVP mais à renforcer en V2

### Données sensibles

- [ ] Pas de credentials en dur dans le code source (chercher "password", "secret", "key" dans le code)
- [ ] Les constantes DEMO_EMAIL/DEMO_PASSWORD sont des identifiants de démo uniquement, pas de prod
- [ ] Le seed SQL ne contient pas de données réelles

---

## 3. CHECKLIST MISE EN PRODUCTION

### Supabase

- [ ] Projet Supabase créé (dédié NXT Finance, pas partagé)
- [ ] Migration 001_initial_schema.sql exécutée sans erreur
- [ ] Migration 002_storage_bucket.sql exécutée sans erreur
- [ ] Bucket `receipts` vérifié dans Storage
- [ ] User démo créé dans Auth (demo@nxt-finance.fr / demo2024)
- [ ] UUID du user démo reporté dans seed.sql
- [ ] Seed.sql exécuté sans erreur
- [ ] Vérifier que les données seedées apparaissent dans les tables
- [ ] RLS activé vérifié sur chaque table (Dashboard > Database > Tables > colonne RLS)
- [ ] Anon key et URL copiées

### Vercel

- [ ] Projet Vercel créé (dédié NXT Finance)
- [ ] Repo GitHub connecté
- [ ] Variables d'environnement configurées :
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Build réussi sur Vercel (vérifier les logs)
- [ ] URL de preview fonctionnelle
- [ ] Test login sur la preview
- [ ] Test navigation complète sur la preview
- [ ] Domaine/sous-domaine configuré si prévu

### Git

- [ ] Repo GitHub créé et pushé
- [ ] .gitignore correct (.env.local, node_modules, .next)
- [ ] Pas de secrets commitvés (vérifier l'historique)
- [ ] Branche main propre

---

## 4. DETTE TECHNIQUE À CORRIGER AVANT VRAIS UTILISATEURS

### BLOQUANT — CORRIGÉS LE 2026-03-15

| # | Point | Statut | Correction |
|---|---|---|---|
| B1 | Création automatique de période | CORRIGÉ | `ensurePeriodExists()` dans auto-period.ts, intégré dans createRevenue + createExpense |
| B2 | Profil utilisateur à l'inscription | CORRIGÉ | Trigger PostgreSQL `handle_new_user` dans migration 004 |
| B3 | Vérification RLS en conditions réelles | CORRIGÉ | Migration 003 (policies DELETE, managers, INSERT profiles) + script test `test_rls_isolation.sql` |
| B4 | Bucket Storage + policies | CORRIGÉ | Migration 002 validée + script test `test_storage.md` |

**Tests restants (nécessitent Supabase live) :**
- [ ] Exécuter migration 003 + 004
- [ ] Exécuter test_rls_isolation.sql avec 2 users
- [ ] Vérifier bucket receipts upload/download
- [ ] Créer un nouveau user → vérifier auto-création profil
- [ ] Créer une recette pour un mois sans période → vérifier auto-création période

### IMPORTANT (à faire avant ouverture à plus de 2-3 utilisateurs)

| # | Point | Effort | Détail |
|---|---|---|---|
| I1 | Audit trail (écriture) | 2h | Les services ne logguent pas encore dans `activity_logs`. Ajouter des appels `insertActivityLog` dans les mutations critiques (changement de statut, validation, transmission, suppression). |
| I2 | Permissions RLS fines pour le rôle comptable | 2h | Actuellement RLS = accès par agence. Un comptable avec `read: false` peut encore lire via Supabase direct. Ajouter des policies RLS qui vérifient `agency_members.permissions` pour le rôle accountant. |
| I3 | Validation des montants côté serveur | 1h | Les validations Zod sont côté client. Pour la sécurité, ajouter des CHECK constraints PostgreSQL ou des Supabase Edge Functions pour valider les montants > 0 et les enums côté serveur. |
| I4 | Gestion des erreurs réseau | 1h | Ajouter un boundary d'erreur global et des retries automatiques sur les mutations TanStack Query en cas d'erreur réseau transitoire. |
| I5 | Rate limiting sur l'alert engine | 30min | L'engine tourne côté client. Si un user spam F5, il peut générer beaucoup de requêtes. Le `staleTime: 5min` atténue, mais un debounce explicite serait plus sûr. |

### AMÉLIORATION (nice-to-have avant V2)

| # | Point | Effort | Détail |
|---|---|---|---|
| A1 | Tendances M-1 sur KPI cards | 1h | Ajouter une requête M-1 et brancher la prop `trend` déjà prévue sur KpiCard. |
| A2 | Dark mode toggle | 30min | Les variables CSS dark sont définies. Ajouter un toggle dans la topbar ou les paramètres. |
| A3 | Export CSV/PDF des périodes | 2h | Modèle `export_jobs` existe. Implémenter une Edge Function Supabase + UI bouton export. |
| A4 | Invitation comptable par email | 2h | Supabase Auth invite flow + création agency_member. |
| A5 | OCR extraction automatique | Variable | Brancher une API OCR (Mindee, Google Vision, etc.) sur l'upload de justificatif. |
| A6 | Suppression du dossier `mocks/` vide | 5min | Le dossier existe mais n'est pas utilisé. |
| A7 | Notifications email | 3h | Brancher un service email (Resend, SendGrid) sur la fréquence configurée dans les paramètres. |

---

## 5. ORDRE DE PRIORITÉ — PLAN D'EXÉCUTION

### Phase 1 : Bloquants (avant premier test réel)
```
B3 → B4 → B2 → B1
```
1. Vérifier RLS avec 2 users (B3)
2. Vérifier bucket Storage (B4)
3. Ajouter le trigger profil auto (B2)
4. Ajouter la création auto de période (B1)

### Phase 2 : Important (avant ouverture élargie)
```
I2 → I1 → I3 → I4 → I5
```

### Phase 3 : Améliorations (avant V2)
```
A1 → A2 → A6 → A3 → A4 → A5 → A7
```
