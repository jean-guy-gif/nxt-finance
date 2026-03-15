-- ============================================
-- TEST I2 — Vérification permissions fines comptable
-- ============================================
-- Exécuter APRÈS la migration 006.
--
-- Ce script modifie les permissions du comptable démo
-- pour tester les restrictions RLS.
-- ============================================

-- === TEST A: Comptable avec read=true (état actuel du seed) ===
-- Le comptable (comptable-demo@nxt-finance.fr) a read=true.
-- → Se connecter avec comptable-demo@nxt-finance.fr / demo2024
-- → Le dashboard doit charger avec les données de l'agence
-- → Les recettes, dépenses, périodes doivent être visibles

-- === TEST B: Retirer la permission read ===
UPDATE agency_members
SET permissions = jsonb_set(permissions, '{read}', 'false')
WHERE user_id = '3f103675-50d5-45c0-aa07-3831f5940668'
  AND role = 'accountant';

-- → Se reconnecter avec comptable-demo@nxt-finance.fr
-- → Le dashboard doit montrer des KPIs vides (—)
-- → Les recettes = "Aucune recette"
-- → Les dépenses = "Aucune dépense"
-- → Les périodes = "Aucune période"
-- → Les alertes = vides
-- → L'espace comptable > commentaires doit TOUJOURS fonctionner
--   (les commentaires restent lisibles même sans read)

-- === TEST C: Retirer aussi la permission comment ===
-- UPDATE agency_members
-- SET permissions = jsonb_set(permissions, '{comment}', 'false')
-- WHERE user_id = '3f103675-50d5-45c0-aa07-3831f5940668'
--   AND role = 'accountant';
-- → L'espace comptable ne doit plus permettre d'ajouter de commentaire
-- → Le bouton "Résoudre" ne doit plus fonctionner

-- === RESTAURER les permissions normales après les tests ===
-- UPDATE agency_members
-- SET permissions = '{"read": true, "download": true, "comment": true, "request_documents": true, "validate_document": true, "validate_period": false, "export": true, "annotate": true}'
-- WHERE user_id = '3f103675-50d5-45c0-aa07-3831f5940668'
--   AND role = 'accountant';
