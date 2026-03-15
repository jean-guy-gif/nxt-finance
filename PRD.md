PRD - NXT Finance
Version: 1.0
Statut: Product Requirements Document MVP
Produit: NXT Finance
Auteur: Jean-Guy Ourmieres
Positionnement: plateforme de pilotage financier et de pré-comptabilité collaborative pour agences immobilières
Audience principale: gérants et directeurs d’agences immobilières
Audience secondaire: assistant(e)s d’agence, administratifs, comptables, experts-comptables

========================================
1. CONTEXTE ET VISION PRODUIT
========================================

NXT Finance est une plateforme SaaS de pilotage financier et de pré-comptabilité collaborative destinée d’abord aux gérants, directeurs d’agences immobilières et professionnels de l’immobilier.

Le produit n’a pas vocation à remplacer le comptable ou l’expert-comptable.
Il doit aider le gérant à:
- mieux piloter son activité
- mieux suivre ses recettes, charges et dépenses
- centraliser ses justificatifs
- mieux préparer sa TVA et ses éléments comptables
- transmettre au cabinet des données plus propres, plus complètes et plus rapidement exploitables

NXT Finance agit comme une couche de pilotage, d’organisation, de préparation et de collaboration comptable.

Le produit doit être:
- simple à comprendre
- rapide à utiliser
- utile au quotidien
- compatible avec un utilisateur non expert de la comptabilité
- conçu pour fonctionner sur ordinateur, tablette et mobile
- compatible agence unique et multi-agences

========================================
2. PROBLÈME À RÉSOUDRE
========================================

Aujourd’hui, les gérants d’agences immobilières rencontrent fréquemment les problèmes suivants:
- visibilité incomplète sur la situation financière réelle de leur activité
- difficulté à suivre clairement chiffre d’affaires, encaissements, charges et dépenses
- tickets et justificatifs dispersés entre téléphone, mails, papiers et outils multiples
- difficulté à préparer proprement la TVA et les éléments comptables
- trop d’allers-retours avec le cabinet comptable
- documents manquants, incomplets ou transmis trop tard
- trop forte dépendance à des process manuels, non fiables et chronophages

Conséquence:
- perte de temps
- manque d’anticipation
- stress administratif
- transmission de données incomplètes au comptable
- difficulté à piloter correctement l’activité

========================================
3. OBJECTIFS PRODUIT
========================================

Objectifs principaux:
- donner une vision claire et opérationnelle de l’activité financière
- centraliser recettes, dépenses et justificatifs
- préparer les éléments utiles à la comptabilité
- aider à suivre la TVA sans se substituer au cabinet
- fluidifier les échanges entre l’agence et le comptable
- réduire les oublis, les anomalies et les relances

Objectifs secondaires:
- proposer une expérience premium, moderne, rassurante
- rendre la pré-comptabilité compréhensible pour un non-comptable
- structurer le produit pour pouvoir évoluer vers des modules plus avancés ultérieurement

========================================
4. CIBLES UTILISATEURS
========================================

Utilisateur principal:
- gérant ou directeur d’agence immobilière

Utilisateurs secondaires:
- assistant(e) d’agence
- collaborateur administratif
- office manager
- comptable
- expert-comptable
- collaborateur du cabinet

========================================
5. POSITIONNEMENT PRODUIT
========================================

NXT Finance n’est pas:
- un logiciel d’expertise comptable
- un cabinet comptable digital
- un outil de production comptable complète
- un substitut à l’expert-comptable

NXT Finance est:
- un cockpit de pilotage financier
- un outil de suivi administratif et pré-comptable
- un espace de structuration des pièces et données
- un espace collaboratif entre l’agence et le cabinet

Phrase de positionnement recommandée:
NXT Finance aide les gérants d’agences immobilières à piloter leur activité financière, structurer leur pré-comptabilité et fluidifier les échanges avec leur expert-comptable.

========================================
6. PÉRIMÈTRE MVP
========================================

Le MVP couvre 5 blocs principaux:
1. tableau de bord financier
2. recettes et encaissements
3. dépenses et justificatifs
4. TVA et périodes comptables
5. espace cabinet / comptable

Le MVP doit inclure un mode démo avec données simulées réalistes afin de permettre:
- démonstration produit
- tests utilisateurs
- visualisation du produit sans intégrations externes immédiates

========================================
7. HORS PÉRIMÈTRE MVP
========================================

Le MVP ne doit pas inclure:
- comptabilité générale complète
- liasse fiscale
- bilan comptable produit par la plateforme
- paie
- production fiscale experte
- rapprochement bancaire avancé
- connecteurs complexes obligatoires au lancement
- moteur expert-comptable
- traitement juridique
- moteur URSSAF ultra détaillé multi-cas
- remplacement du cabinet

========================================
8. STRUCTURE GLOBALE DU PRODUIT
========================================

Navigation principale recommandée:
- Tableau de bord
- Recettes
- Dépenses & justificatifs
- TVA & périodes
- Comptable
- Paramètres

Le produit doit rester simple pour une agence unique, tout en étant pensé nativement pour supporter un environnement multi-agences.

========================================
9. TEMPORALITÉ DES VUES
========================================

Le produit doit permettre trois niveaux de lecture:
- mensuel
- trimestriel
- annuel

Règles:
- la vue mensuelle est la vue par défaut et le point d’entrée principal
- la vue trimestrielle consolide les indicateurs mensuels
- la vue annuelle permet une lecture de trajectoire et de comparaison globale

========================================
10. MODULE 1 - TABLEAU DE BORD FINANCIER
========================================

Objectif:
donner au gérant une lecture immédiate, synthétique et actionnable de son activité.

Contenu minimum:
- chiffre d’affaires de la période
- encaissements de la période
- charges de la période
- dépenses enregistrées de la période
- trésorerie visible / renseignée
- TVA estimée
- alertes prioritaires
- nombre de pièces manquantes
- nombre de dépenses à vérifier
- demandes cabinet non traitées

Composants recommandés:
- bloc synthèse
- bloc alertes
- bloc activité
- bloc administratif / pré-compta
- bloc actions rapides

Actions rapides:
- ajouter une recette
- ajouter une dépense
- ajouter un justificatif
- traiter une demande cabinet
- ouvrir la période en cours

Critères d’acceptation:
- lecture utile en moins de 10 secondes
- indicateurs principaux visibles sans scroll excessif
- hiérarchisation claire entre information, vigilance et critique
- navigation rapide vers les détails

========================================
11. MODULE 2 - RECETTES / ENCAISSEMENTS
========================================

Objectif:
permettre au gérant de suivre ses recettes et encaissements afin d’avoir une vision plus juste de la réalité économique de son activité.

Fonctionnalités MVP:
- créer une recette manuellement
- importer ou simuler des recettes en mode démo
- distinguer:
  - chiffre d’affaires
  - encaissements réels
  - recettes à vérifier
  - recettes en attente si nécessaire
- rattacher une recette à une période
- catégoriser une recette
- relier une recette à une agence
- afficher les recettes dans le dashboard
- intégrer les recettes aux alertes et indicateurs

Champs minimum d’une recette:
- date
- libellé
- type
- source
- montant
- montant HT si pertinent
- montant TTC si pertinent
- TVA si pertinente
- période comptable
- statut
- commentaire
- agence liée
- créé par
- date de création
- date de mise à jour

Statuts minimum:
- brouillon
- à vérifier
- validée
- encaissée
- transmise

Critères d’acceptation:
- visualisation claire des recettes du mois
- différence visible entre activité produite et argent encaissé si disponible
- intégration des recettes dans les indicateurs mensuels, trimestriels, annuels

========================================
12. MODULE 3 - DÉPENSES ET JUSTIFICATIFS
========================================

Objectif:
centraliser les dépenses et les justificatifs afin de simplifier la préparation comptable.

Fonctionnalités MVP:
- ajouter une dépense manuellement
- prendre en photo un ticket
- déposer une facture PDF ou image
- OCR simple sur ticket / facture
- extraction semi-automatique:
  - date
  - fournisseur
  - montant TTC
  - montant HT
  - TVA
- correction manuelle des données extraites
- catégorisation comptable simple
- rattachement à une période
- rattachement à une agence
- liaison justificatif <-> dépense
- filtres et recherche
- détection de pièces manquantes
- détection d’anomalies simples
- détection de doublons probables

Catégories minimales:
- carburant
- repas
- déplacements
- publicité / marketing
- logiciels / abonnements
- honoraires
- fournitures
- téléphonie / internet
- frais bancaires
- autres charges

Champs minimum d’une dépense:
- date
- fournisseur
- montant TTC
- montant HT
- TVA
- catégorie
- commentaire
- mode de paiement
- statut
- période comptable
- agence liée
- justificatif lié
- créé par
- date de création
- date de mise à jour

Statuts de dépense:
- brouillon
- à vérifier
- validée
- transmise

Champs minimum d’un justificatif:
- nom du fichier
- type de fichier
- source
- OCR brut
- date détectée
- fournisseur détecté
- montant détecté
- TVA détectée
- niveau de confiance OCR
- statut
- dépense liée
- anomalies détectées
- agence liée
- créé par

Statuts de justificatif:
- reçu
- à vérifier
- illisible
- incomplet
- exploitable
- transmis

Règles métier:
- un justificatif peut exister sans dépense liée
- une dépense peut exister sans justificatif au départ
- la valeur validée manuellement prime sur l’OCR
- une pièce illisible ne doit jamais être exploitée silencieusement
- une pièce sans TVA fiable doit être signalée
- une pièce suspectée en doublon ne doit pas bloquer le flux mais doit alerter

Critères d’acceptation:
- création d’une dépense en moins de 30 secondes
- ajout de justificatif depuis mobile, tablette, desktop
- correction manuelle toujours possible
- statut clair et visible sur chaque pièce et chaque dépense

========================================
13. MODULE 4 - TVA ET PÉRIODES COMPTABLES
========================================

Objectif:
aider à préparer la TVA et la complétude comptable d’une période sans se substituer au cabinet.

Fonctionnalités MVP:
- afficher TVA déductible estimée
- afficher TVA collectée estimée
- afficher le solde estimé
- lister les pièces prises en compte
- lister les pièces exclues ou douteuses
- signaler les pièces sans TVA exploitable
- signaler les incohérences HT / TTC / TVA
- afficher un statut de période
- exporter les éléments utiles au comptable

Statuts de période:
- en cours
- incomplète
- à vérifier
- prête à transmettre
- transmise

Champs minimum d’une période:
- mois
- année
- date de début
- date de fin
- statut
- taux de complétude
- nombre de pièces attendues
- nombre de pièces reçues
- nombre d’anomalies
- état TVA
- partagée au cabinet ou non
- agence liée

Règles métier:
- les calculs TVA sont des estimations préparatoires
- toute estimation doit être rattachable à des pièces identifiables
- une pièce non exploitable ne doit pas être intégrée sans avertissement
- une période ne peut pas être “prête à transmettre” si des anomalies bloquantes subsistent

Critères d’acceptation:
- lecture simple de l’état TVA d’une période
- traçabilité des pièces utilisées
- visibilité des anomalies
- capacité à transmettre proprement les éléments au cabinet

========================================
14. MODULE 5 - ESPACE CABINET / COMPTABLE
========================================

Objectif:
fluidifier les échanges avec le cabinet comptable.

Fonctionnalités MVP:
- créer un accès cabinet
- gérer des permissions fines par agence
- permettre au cabinet de consulter les données partagées
- permettre au cabinet de commenter
- permettre au cabinet de demander des compléments
- permettre au cabinet d’annoter
- permettre au cabinet de valider une pièce
- permettre au cabinet de valider la complétude d’une période si autorisé
- permettre au cabinet de marquer une période comme exploitable ou à compléter
- permettre au cabinet d’exporter les éléments utiles

Droits cabinet configurables:
- lecture
- téléchargement
- commentaire
- demande de pièces
- validation pièce
- validation période
- export
- annotation

Règles métier:
- les droits cabinet ne sont jamais implicites
- le gérant contrôle le périmètre autorisé
- toute action du cabinet est historisée
- le cabinet ne modifie pas les données métier internes cœur sans permission explicite
- l’agence doit voir qui a validé quoi, quand, et sur quel objet

Critères d’acceptation:
- visibilité complète des demandes cabinet
- historique des échanges
- contrôle strict des permissions
- exploitation simple côté cabinet

========================================
15. SYSTÈME D’ALERTES
========================================

Objectif:
signaler les points à surveiller ou traiter sans se substituer au jugement du comptable.

Niveaux d’alerte:
- information
- vigilance
- critique

Alertes trésorerie / activité:
- dépenses supérieures aux encaissements sur la période
- trésorerie disponible sous seuil
- trésorerie projetée courte sous seuil critique
- charges fixes en hausse anormale
- forte baisse des encaissements
- décalage important entre chiffre d’affaires et encaissements
- forte activité déclarée mais trésorerie faible

Alertes TVA:
- période TVA non préparée à temps
- pièces sans TVA exploitable
- incohérence HT / TTC / TVA
- TVA déductible supérieure à TVA collectée
- trop de pièces incomplètes
- période TVA incomplète

Alertes pré-compta:
- dépense sans justificatif
- justificatif illisible
- justificatif incomplet
- dépense non catégorisée
- doublon probable
- montant incohérent
- trop grand nombre de pièces à vérifier

Alertes collaboration cabinet:
- pièce demandée par le cabinet non fournie
- commentaire cabinet non traité
- période prête à transmettre
- période bloquée faute de pièces

Réglages:
- seuil de trésorerie critique
- date limite interne de préparation
- tolérance sur pièces manquantes
- fréquence des notifications
- canaux:
  - in-app
  - email
  - résumé périodique

Important:
“TVA déductible supérieure à la TVA collectée” doit être traitée comme un point d’attention ou de vigilance, pas comme une anomalie systématique.

========================================
16. RÔLES ET PERMISSIONS
========================================

Rôles de base:
- gérant
- assistant / administratif
- comptable / cabinet

Gérant:
- accès total à l’agence
- dashboard
- recettes
- dépenses
- justificatifs
- TVA
- périodes
- gestion des accès
- paramétrage
- partage cabinet

Assistant / administratif:
- ajout / modification des dépenses
- ajout / modification des justificatifs
- ajout / modification des recettes selon droits
- pré-classement
- accès limité aux paramètres selon droits

Comptable / cabinet:
- lecture des données partagées
- commentaire
- demande de complément
- annotation
- validation si autorisée
- export si autorisé

En multi-agences:
- tous les droits sont définis par agence
- un utilisateur peut avoir des rôles différents selon l’agence

========================================
17. MODE AGENCE UNIQUE / MULTI-AGENCES
========================================

Le produit doit être conçu nativement pour supporter:
- agence unique
- multi-agences

Règles:
- toute donnée métier appartient à une agence
- toutes les permissions sont définies par agence
- l’UX agence unique doit rester simple
- la consolidation multi-agences peut être limitée au MVP mais l’architecture doit la permettre

========================================
18. MODE DÉMO
========================================

Le produit doit inclure un mode démo cohérent avec données simulées pour:
- présenter le dashboard
- montrer recettes, dépenses, justificatifs, TVA, périodes
- montrer les alertes
- montrer le rôle cabinet
- montrer une lecture mensuelle, trimestrielle et annuelle

Le mode démo doit être identifiable clairement comme démonstration et ne pas être confondu avec des données réelles.

========================================
19. EXPÉRIENCE MULTI-SUPPORTS
========================================

Le produit doit fonctionner correctement sur:
- ordinateur
- tablette
- smartphone

Priorités mobile:
- photo ticket
- upload justificatif
- consultation alertes
- traitement rapide d’une demande cabinet

Priorités desktop:
- dashboard complet
- revue de période
- exports
- filtres avancés
- gestion détaillée

Contraintes UX:
- responsive complet
- lisibilité sur petit écran
- actions fréquentes accessibles rapidement
- tables adaptées au mobile avec vues simplifiées si nécessaire

========================================
20. DESIGN ET UX
========================================

Le design doit reprendre strictement l’ADN de la plateforme existante de référence du client.
Claude doit:
- conserver une cohérence visuelle premium
- utiliser une hiérarchie visuelle claire
- éviter l’effet “logiciel comptable froid”
- privilégier un design clair, rassurant, moderne
- utiliser un wording non technique et orienté action

À prévoir côté implémentation:
- design system réutilisable
- composants cohérents
- spacing et cards homogènes
- états vides travaillés
- filtres lisibles
- tableaux propres
- responsive maîtrisé

========================================
21. OBJETS MÉTIER PRINCIPAUX
========================================

Objets métier minimum:
- Agency
- User
- Revenue
- Expense
- ReceiptDocument
- AccountingPeriod
- Alert
- AccountantComment
- PermissionSet
- ExportJob

Chaque objet doit inclure a minima:
- id
- agencyId si pertinent
- createdAt
- updatedAt
- createdBy si pertinent
- status si pertinent

========================================
22. USER STORIES PRINCIPALES
========================================

En tant que gérant:
- je veux voir mon activité mensuelle rapidement
- je veux suivre mes encaissements, mes dépenses et ma trésorerie
- je veux ajouter facilement un ticket ou une facture
- je veux savoir quelles pièces manquent
- je veux suivre ma TVA estimée
- je veux préparer mes périodes avant transmission
- je veux collaborer proprement avec mon cabinet

En tant qu’assistant:
- je veux ajouter et classer les pièces rapidement
- je veux corriger les données extraites
- je veux suivre les éléments à traiter
- je veux réduire les oublis administratifs

En tant que cabinet:
- je veux accéder rapidement aux éléments partagés
- je veux demander des compléments
- je veux commenter des pièces ou périodes
- je veux valider ce qui est exploitable si j’y suis autorisé
- je veux exporter les pièces et données utiles

========================================
23. CRITÈRES D’ACCEPTATION GLOBAUX
========================================

Le MVP est considéré comme réussi si:
- un gérant comprend son mois sans fichier externe
- il peut ajouter recettes, dépenses et justificatifs simplement
- il peut suivre la complétude de la période
- il peut visualiser une TVA estimative préparatoire
- le cabinet peut collaborer dans l’outil
- les alertes sont lisibles, hiérarchisées et actionnables
- le produit fonctionne sur mobile, tablette et desktop
- le produit ne laisse jamais croire qu’il remplace le comptable

========================================
24. EXIGENCES NON FONCTIONNELLES
========================================

Performance:
- dashboard rapide
- upload fluide
- OCR asynchrone avec retour d’état clair
- recherche et filtres réactifs

Sécurité:
- authentification solide
- isolation stricte par agence
- permissions cabinet strictes
- stockage sécurisé des pièces
- traçabilité des actions

Fiabilité:
- distinction entre donnée extraite, donnée saisie, donnée validée
- distinction entre estimation et donnée certifiée
- visibilité claire des anomalies

Traçabilité:
- journal des actions
- historique des statuts
- historique des validations
- historique des commentaires cabinet

========================================
25. ROADMAP RECOMMANDÉE
========================================

V1:
- dashboard simple
- recettes
- dépenses
- justificatifs
- OCR simple
- TVA estimative
- périodes comptables
- espace cabinet
- alertes de base
- mode démo

V2:
- benchmark concurrent enrichi
- imports bancaires
- catégorisation semi-automatique
- complétude plus fine
- exports enrichis
- échéancier plus poussé
- relances automatiques
- améliorations UX

V3:
- prévisions de trésorerie avancées
- consolidation multi-agences plus poussée
- connecteurs logiciels immobiliers
- détection avancée d’anomalies
- workflows cabinet plus riches

========================================
26. CONSIGNES À CLAUDE CODE
========================================

Tu dois implémenter NXT Finance comme une vraie application SaaS MVP, en respectant strictement ce PRD.

Contraintes d’implémentation:
- construire une base propre, modulaire et extensible
- séparer clairement frontend, logique métier et data layer
- prévoir une architecture compatible agence unique et multi-agences
- prévoir un mode démo avec données simulées réalistes
- ne pas surcharger le MVP avec des fonctions hors périmètre
- conserver une UX premium, simple et rassurante
- ne jamais présenter le produit comme un remplacement du comptable
- utiliser des composants propres et réutilisables
- prévoir la compatibilité desktop, tablette, mobile

Livrables attendus:
- architecture applicative
- schéma de navigation
- structure de données
- composants UI
- pages principales
- système de rôles et permissions
- système d’alertes
- mode démo
- base suffisamment propre pour itérer ensuite

Si une hypothèse technique est nécessaire:
- choisir la solution la plus simple, propre et scalable
- documenter brièvement l’hypothèse
- continuer sans poser une chaîne interminable de questions
Indépendance produit et technique

NXT Finance doit être conçu comme une application distincte de NXT Performance.

Contraintes de structuration :
- repository GitHub dédié
- projet Vercel dédié
- configuration d’environnement dédiée
- pipeline de déploiement dédié
- base de données et backend à isoler logiquement du reste de l’écosystème
- autonomie de versioning, de roadmap et de maintenance

Même si certaines briques de réflexion, de design ou de pilotage issues de NXT Performance peuvent inspirer NXT Finance, le produit final ne doit pas être implémenté comme un sous-module technique de NXT Performance.
Indépendance fonctionnelle du produit

NXT Finance doit être conçu comme une application pleinement autonome.

Le produit peut être rattaché à un dashboard ou à un écosystème plus large, mais il doit pouvoir être utilisé indépendamment par un utilisateur n’ayant accès qu’à NXT Finance.

Conséquences produit :
- navigation complète autonome
- dashboard autonome
- authentification autonome
- permissions autonomes
- expérience cohérente sans dépendance à d’autres modules
- aucun écran ne doit supposer l’existence d’un autre outil externe pour fonctionner

Conséquences techniques :
- application standalone first
- architecture compatible avec une intégration future dans un écosystème plus large
- aucun couplage fort à NXT Performance
- possibilité future de fédération d’authentification ou de navigation, sans l’imposer au MVP