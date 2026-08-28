# Bâtire — matériaux de construction de réemploi

Neuvième application de l'écosystème Groupe MES. Même trio que la Recyclerie —
boutique en ligne, vitrine kiosque, CRM — appliqué aux matériaux du bâtiment.

## Modèle

Un matériau se vend au m², au m³, à la tonne, au mètre linéaire ou à la
palette : l'unité de vente commande le prix et le stock. La fiche porte aussi
les dimensions, l'épaisseur, la matière, les normes, le conditionnement et
l'emplacement au dépôt. L'IA la remplit à partir des photos.

## Espaces

| Route | Pour qui |
|---|---|
| `/` | Boutique publique : catalogue, filtres, fiche matériau, demande de devis |
| `/kiosk` | Vitrine du dépôt : même catalogue, sans formulaire |
| `/qr/:reference` | Atterrissage d'un QR code collé sur un matériau |
| `/crm` | Équipe : matériaux, demandes, QR codes |

## Backend

Aucun backend propre : l'app parle au déploiement Convex **partagé** de
l'écosystème (`prod:hip-marten-394`), via `convex/batire.ts` — module canonique
dans `~/mesoutils/convex`, recopié ici en lecture seule par `sync-convex.sh`.
Tables préfixées `bt`, sans lien avec les `articles` de la Recyclerie.

Les droits (`batire:materiaux`, `batire:demandes`, `batire:admin`)
s'administrent depuis la page Admin de Mes Outils.

## Développement

```bash
cp .env.example .env.local   # clés Convex et Clerk de production
npm install
npm run dev
```
