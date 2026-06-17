export enum Roles {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  AGENT_CHINE = "AGENT_CHINE",
  AGENT_MALI = "AGENT_MALI",
  AGENT_CI = "AGENT_CI",
}

export function isAdmin(role: string): boolean {
  return role === Roles.SUPER_ADMIN || role === Roles.ADMIN;
}

export enum StatutColis {
  ENREGISTRE = "ENREGISTRE",           // Colis saisi dans le système à l'agence Chine
  EN_COURS_ENVOI = "EN_COURS_ENVOI",   // Colis pris en charge par le transporteur
  EN_TRANSIT = "EN_TRANSIT",           // Colis en route (vol, fret maritime, transit douanier)
  ARRIVE_AGENCE = "ARRIVE_AGENCE",     // Colis réceptionné à l'agence de destination
  PRET_RETIRER = "PRET_RETIRER",       // Client notifié, colis disponible au comptoir
  LIVRE = "LIVRE",                     // Colis remis au client, solde encaissé
  LITIGE = "LITIGE",                   // Problème signalé (perte, dommage, retard anormal)
  ANNULE = "ANNULE",                   // Annulé
}

export enum Destination {
  MALI = "MALI",
  COTE_DIVOIRE = "COTE_DIVOIRE",
}

export enum PaysAgence {
  CHINE = "CHINE",
  MALI = "MALI",
  COTE_DIVOIRE = "COTE_DIVOIRE",
}

export enum TypePaiement {
  AVANCE = "AVANCE",
  SOLDE = "SOLDE",
}
