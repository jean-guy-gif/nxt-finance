# Test Storage — Vérification bucket receipts

## Prérequis
- Projet Supabase configuré
- Migrations 001 + 002 exécutées
- Seed exécuté
- User démo connecté dans l'app

## Test 1 : Upload fonctionne
1. Se connecter avec demo@nxt-finance.fr
2. Aller sur /depenses
3. Cliquer "Justificatif"
4. Uploader un fichier JPEG ou PDF < 10 Mo
5. **Attendu** : upload réussi, pas d'erreur

## Test 2 : Fichier accessible
1. Aller sur /depenses, cliquer une dépense qui a un justificatif seedé
2. Cliquer "Voir" sur un ReceiptCard
3. **Attendu** : erreur 404 (les fichiers seedés n'existent pas physiquement dans Storage)
4. Uploader un vrai fichier, puis cliquer "Voir"
5. **Attendu** : le fichier s'ouvre dans un nouvel onglet via signed URL

## Test 3 : Isolation inter-agences
1. Avec le user de test-isolation (B1), essayer d'accéder à une signed URL d'un fichier de l'agence démo
2. **Attendu** : accès refusé (403 ou URL invalide)

## Test 4 : Bucket privé
1. Essayer d'accéder directement à `{supabase_url}/storage/v1/object/public/receipts/{path}`
2. **Attendu** : 400 ou 403, le bucket n'est pas public

## Vérification Dashboard Supabase
1. Storage > receipts > vérifier que le bucket existe
2. Storage > Policies > vérifier 3 policies (INSERT, SELECT, DELETE)
3. Chaque policy filtre par `(storage.foldername(name))[1]` = agency_id du user
