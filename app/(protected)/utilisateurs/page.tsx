"use client";

import { useState } from "react";
import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { PasswordInput } from "@/components/password-input";
import { Plus, Pencil, ToggleLeft, ToggleRight, Search, Loader2, Check } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { userSchema } from "@/lib/validation-schema";
import { Roles, isAdmin } from "@/lib/enums";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  AGENT_CHINE: "Agent Chine",
  AGENT_MALI: "Agent Mali",
  AGENT_CI: "Agent CI",
};

export default function UtilisateursPage() {
  const { users, loading, createUser, updateUser, toggleActive, refetch } =
    useUsers();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstname: "",
      lastname: "",
      email: "",
      phone: "",
      password: "",
      role: Roles.AGENT_CHINE,
    },
  });
  const { isSubmitting } = form.formState;

  const filtered = users.filter(
    (u) =>
      search === "" ||
      u.firstname?.toLowerCase().includes(search.toLowerCase()) ||
      u.lastname?.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditId(null);
    form.reset({
      firstname: "",
      lastname: "",
      email: "",
      phone: "",
      password: "",
      role: Roles.AGENT_CHINE,
    });
    setOpen(true);
  }

  function openEdit(user: (typeof users)[0]) {
    setEditId(user.id);
    form.reset({
      firstname: user.firstname ?? "",
      lastname: user.lastname ?? "",
      email: user.email,
      phone: user.phone ?? "",
      password: "placeholder",
      role: user.role,
    });
    setOpen(true);
  }

  async function onSubmit(values: z.infer<typeof userSchema>) {
    if (editId) {
      const res = await updateUser(editId, values);
      if (res.success) {
        toast.success("Agent mis à jour", { position: "bottom-right" });
        setOpen(false);
      } else {
        toast.error(res.error ?? "Erreur", { position: "bottom-right" });
      }
    } else {
      const res = await createUser(values);
      if (res.success) {
        toast.success("Agent créé", { position: "bottom-right" });
        setOpen(false);
      } else {
        toast.error(res.error ?? "Erreur", { position: "bottom-right" });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-bold uppercase tracking-[0.2em]">Agents</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Nouvel agent
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead className="text-center">Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  Aucun agent
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.firstname} {u.lastname}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={u.active ? "success" : "destructive"}>
                      {u.active ? "Actif" : "Suspendu"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={togglingId === u.id}
                        onClick={async () => {
                          setTogglingId(u.id);
                          await toggleActive(u.id, !u.active);
                          refetch();
                          setTogglingId(null);
                        }}
                      >
                        {togglingId === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : u.active ? (
                          <ToggleRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Modifier l'agent" : "Nouvel agent"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="firstname"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Prénom</FieldLabel>
                      <Input {...field} placeholder="Prénom" />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="lastname"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Nom</FieldLabel>
                      <Input {...field} placeholder="Nom" />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Email</FieldLabel>
                    <Input
                      {...field}
                      placeholder="agent@example.com"
                      disabled={!!editId}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Téléphone</FieldLabel>
                    <Input {...field} placeholder="+223 XX XX XX XX" />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="role"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Rôle</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Roles.SUPER_ADMIN}>
                          Super Admin
                        </SelectItem>
                        <SelectItem value={Roles.ADMIN}>
                          Admin
                        </SelectItem>
                        <SelectItem value={Roles.AGENT_CHINE}>
                          Agent Chine
                        </SelectItem>
                        <SelectItem value={Roles.AGENT_MALI}>
                          Agent Mali
                        </SelectItem>
                        <SelectItem value={Roles.AGENT_CI}>
                          Agent CI
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {!editId && (
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Mot de passe</FieldLabel>
                      <PasswordInput
                        {...field}
                        placeholder="Minimum 8 caractères"
                        autoComplete="new-password"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editId ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
