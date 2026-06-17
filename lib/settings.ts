import { prisma } from "@/lib/prisma";

export async function getEtablissement(): Promise<string> {
  const row = await prisma.appSetting.findUnique({ where: { key: "etablissement" } });
  return row?.value ?? "CF AirCargo";
}

export async function isMaintenanceMode(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { key: "maintenanceMode" } });
  return row?.value === "true";
}
