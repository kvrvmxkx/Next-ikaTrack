import { z } from "zod";
import { Destination } from "./enums";

// Garde-fous de saisie — deux colis ont été enregistrés avec un téléphone
// ou un prix tapé dans le champ poids (74 000 688 kg, 19 200 kg)
export const MAX_POIDS_KG = 1000;
export const MAX_PRIX_XOF = 10_000_000;
export const MAX_RETRAIT_XOF = 50_000_000;

// Les inputs HTML type="number" retournent des strings → on garde string + coerce dans onSubmit
export const colisSchema = z.object({
  description: z.string().optional(),
  poids: z.string().min(1, "Poids requis"),
  nombreColis: z.string().optional(),
  destination: z.nativeEnum(Destination, { message: "Destination invalide" }),
  tarifId: z.string().optional(),
  expediteurEstFournisseur: z.boolean(),
  expediteurNom: z.string().optional(),
  expediteurPhone: z.string().optional(),
  destinataireNom: z.string().min(2, "Nom destinataire requis"),
  destinatairePhone: z.string().min(8, "Téléphone destinataire requis"),
  destinataireVille: z.string().optional(),
  destinataireAdresse: z.string().optional(),
  avance: z.string().optional(),
  notes: z.string().optional(),
  express: z.boolean(),
}).superRefine((data, ctx) => {
  const poids = parseFloat(data.poids);
  if (isNaN(poids) || poids <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Poids invalide", path: ["poids"] });
  } else if (poids > MAX_POIDS_KG) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Poids maximum : ${MAX_POIDS_KG} kg — vérifie la saisie`, path: ["poids"] });
  }
  if (data.avance) {
    const avance = parseFloat(data.avance);
    if (!isNaN(avance) && avance > MAX_PRIX_XOF) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Avance maximum : ${MAX_PRIX_XOF.toLocaleString("fr-FR")} XOF`, path: ["avance"] });
    }
  }
  if (!data.expediteurEstFournisseur) {
    if (!data.expediteurNom || data.expediteurNom.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nom expéditeur requis", path: ["expediteurNom"] });
    }
    if (!data.expediteurPhone || data.expediteurPhone.length < 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Téléphone expéditeur requis", path: ["expediteurPhone"] });
    }
  }
  if (!data.express && (!data.tarifId || data.tarifId.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tarif requis", path: ["tarifId"] });
  }
});

export const userSchema = z.object({
  firstname: z.string().min(2, "Prénom requis"),
  lastname: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(8, "Téléphone requis"),
  password: z.string().min(6, "Mot de passe : 6 caractères minimum"),
  role: z.string().min(1, "Rôle requis"),
  agenceId: z.string().optional(),
});

export const updateUserSchema = userSchema
  .omit({ password: true })
  .extend({ password: z.string().optional() });
