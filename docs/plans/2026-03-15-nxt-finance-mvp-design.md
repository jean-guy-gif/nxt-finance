# NXT Finance MVP — Design Document

**Date**: 2026-03-15
**Statut**: Validé
**Auteur**: Jean-Guy Ourmieres + Claude

---

## Stack technique

| Couche | Choix |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Langage | TypeScript strict |
| Styling | Tailwind CSS 3.4+ |
| Composants UI | shadcn/ui |
| État global | Zustand (session, agence, démo, UI) |
| Data fetching | TanStack Query v5 (toutes données serveur) |
| Backend | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Icônes | Lucide React |
| Formulaires | React Hook Form + Zod |
| Charts | Recharts |
| Tables | TanStack Table |
| Dates | date-fns |

## Séparation état

- **Zustand** : user courant, agence active, mode démo, préférences UI, filtres globaux
- **TanStack Query** : recettes, dépenses, justificatifs, périodes, TVA, commentaires cabinet, alertes, exports

## Architecture

- Feature-based : chaque module métier est autonome (components, hooks, services, types)
- Data layer abstrait via services encapsulant Supabase
- RLS Supabase pour isolation par agence
- Auth Supabase (email/password)
- Mode démo via seed Supabase (is_demo flag)

## Navigation MVP

| Route | Label |
|---|---|
| `/` | Tableau de bord |
| `/recettes` | Recettes |
| `/depenses` | Dépenses |
| `/periodes` | Périodes |
| `/comptable` | Comptable |
| `/parametres` | Paramètres |

## Schéma base de données

Tables : agencies, user_profiles, agency_members, revenues, expenses, receipt_documents, accounting_periods, alerts, accountant_comments, export_jobs, activity_logs

### Décisions clés

1. **accounting_periods** : TVA = snapshots horodatés (vat_snapshot_at). Complétude = calculée dynamiquement, jamais persistée.
2. **receipt_documents** : rattachement polymorphique via related_type enum ('expense'|'revenue') + related_id.
3. **Enums** : tous les champs métier critiques sont des PostgreSQL enums (revenue_type, expense_category, statuts, rôles, etc.)
4. **export_jobs** : asynchrone, stockage Supabase Storage.
5. **activity_logs** : audit trail simple, changes en jsonb, écriture côté service.
6. **Mode démo** : seed Supabase, agence is_demo=true, mêmes tables/contraintes, bandeau UI.

## Plan de build

1. Socle projet (Next.js, Tailwind, shadcn, Supabase, types, stores, providers)
2. Auth + Shell (login, middleware, layout sidebar/topbar, navigation)
3. Design system (KpiCard, StatusBadge, AlertBanner, DataTable, EmptyState, FileUpload, DemoBanner)
4. Dashboard
5. Recettes
6. Dépenses & justificatifs
7. Périodes & TVA
8. Espace cabinet
9. Paramètres
10. Alertes transverses
11. Mode démo (seed complet)
12. Responsive + polish
