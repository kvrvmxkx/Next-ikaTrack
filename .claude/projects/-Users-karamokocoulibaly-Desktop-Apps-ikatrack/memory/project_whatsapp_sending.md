---
name: project-whatsapp-sending
description: Règles d'envoi WhatsApp (Wasender) dans ikaTrack — qui reçoit quoi et quand
metadata:
  type: project
---

À la création d'un colis, deux messages sont envoyés via Wasender :
- Au **destinataire** : toujours
- À l'**expéditeur** : uniquement si `expediteurEstFournisseur === false`

**Why:** Les fournisseurs sont des entreprises chinoises qui n'ont pas besoin de notifications WhatsApp individuelles.

**How to apply:** Toujours vérifier `!expediteurEstFournisseur` avant d'envoyer au `expediteurPhone`. Implémenté dans `app/api/colis/route.ts`.

Après la création, un message est également envoyé lors des **changements de statut** (routes `/status` et `/bulk-statut`).