"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { Loader2Icon } from "lucide-react";
import { PasswordInput } from "@/components/password-input";

const formSchema = z.object({
  email: z.email("Email invalide."),
  password: z.string().min(1, "Mot de passe requis"),
});

export default function LoginPage() {
  const [invalidCredentials, setInvalidCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await authClient.signIn.email(
      {
        email: values.email,
        password: values.password,
        callbackURL: "/tableau-de-bord",
        rememberMe: false,
      },
      {
        onSuccess() { setInvalidCredentials(false); setIsLoading(false); },
        onError()   { setInvalidCredentials(true);  setIsLoading(false); },
        onRequest()  { setIsLoading(true); },
      }
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2 w-full">
      {/* Left panel — black, typographic */}
      <div className="bg-foreground text-background relative hidden lg:flex flex-col justify-between p-12">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-40">
            Système de suivi de colis
          </p>
        </div>
        <div>
          <h1 className="text-6xl font-bold font-display leading-none mb-6">
            ikaTrack
          </h1>
         
          <p className="text-xs opacity-40 leading-relaxed max-w-xs">
            Plateforme de gestion des colis. Suivez chaque expédition en temps réel, gérez les paiements, les dettes et les groupages, et tenez vos clients informés à chaque étape via SMS automatiques.
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] opacity-30">
          Par Ika Services SARL
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-col p-6 md:p-12">
        {/* Mobile header */}
        <div className="flex items-center gap-3 mb-12 lg:hidden">
          <span className="text-sm font-bold uppercase tracking-[0.2em]">ikaTrack</span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2">
                Accès sécurisé
              </p>
              <h2 className="text-2xl font-bold font-display">Connexion</h2>
              {invalidCredentials && (
                <p className="text-destructive text-sm mt-2 font-medium">
                  Identifiants incorrects.
                </p>
              )}
            </div>

            <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Courriel</FieldLabel>
                      <Input
                        {...field}
                        id="email"
                        aria-invalid={fieldState.invalid}
                        placeholder="agent@example.com"
                        autoComplete="email"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Mot de passe</FieldLabel>
                      <PasswordInput
                        {...field}
                        id="password"
                        aria-invalid={fieldState.invalid}
                        placeholder="Votre mot de passe"
                        autoComplete="current-password"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Field>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2Icon className="animate-spin" /> : "Connexion"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
