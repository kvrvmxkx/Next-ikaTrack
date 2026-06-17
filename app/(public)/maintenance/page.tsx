import { Package } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <Package className="w-10 h-10 mx-auto text-muted-foreground/30" />
        <div className="space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Package Tracker
          </p>
          <h1 className="text-xl font-bold uppercase tracking-wider">
            Maintenance en cours
          </h1>
          <p className="text-sm text-muted-foreground">
            L&apos;application est temporairement indisponible. Veuillez réessayer dans quelques instants.
          </p>
        </div>
      </div>
    </div>
  );
}
