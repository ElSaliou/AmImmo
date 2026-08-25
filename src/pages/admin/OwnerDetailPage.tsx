import { useParams, Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { useOwner, useOwnerProperties } from "@/hooks/use-owners";
import { useMandates, useDeleteMandate } from "@/hooks/use-mandates";
import { useDocuments } from "@/hooks/use-documents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EmptyState from "@/components/admin/EmptyState";
import OwnerFormDialog from "@/components/admin/OwnerFormDialog";
import MandateFormDialog from "@/components/admin/MandateFormDialog";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Pencil, Plus, Users, Building2, FileSignature, FolderOpen, Home,
  Mail, Phone, MapPin, IdCard, Landmark, Smartphone, StickyNote, Trash2,
} from "lucide-react";

const typeLabels: Record<string, string> = { management: "Gestion", rental: "Location", sale: "Vente" };
const statusLabels: Record<string, string> = { draft: "Brouillon", active: "Actif", expired: "Expiré", terminated: "Résilié" };

const Info = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value || "—"}</p>
    </div>
  </div>
);

const OwnerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: owner, isLoading } = useOwner(id);
  const { data: properties, isLoading: loadingProps } = useOwnerProperties(id);
  const { data: mandates, isLoading: loadingMandates } = useMandates(id);
  const { data: documents } = useDocuments("owners", id);
  const delMandate = useDeleteMandate();
  const [editOpen, setEditOpen] = useState(false);
  const [mandateOpen, setMandateOpen] = useState(false);
  const [mandateId, setMandateId] = useState<string | undefined>();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!owner) {
    return <EmptyState icon={Users} title="Propriétaire introuvable" description="Ce propriétaire n'existe plus." />;
  }

  return (
    <PageShell
      title={owner.full_name}
      subtitle={owner.kind === "company" ? owner.company || "Entreprise" : "Propriétaire particulier"}
      actions={
        <>
          <Button variant="outline" asChild>
            <Link to="/admin/owners"><ArrowLeft className="h-4 w-4" /> Retour</Link>
          </Button>
          <Button onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Modifier</Button>
        </>
      }
    >
      <Tabs defaultValue="infos">
        <TabsList>
          <TabsTrigger value="infos"><Users className="h-4 w-4 mr-1.5" /> Informations</TabsTrigger>
          <TabsTrigger value="properties"><Home className="h-4 w-4 mr-1.5" /> Biens ({properties?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="mandates"><FileSignature className="h-4 w-4 mr-1.5" /> Mandats ({mandates?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="documents"><FolderOpen className="h-4 w-4 mr-1.5" /> Documents ({documents?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="infos" className="mt-6 space-y-4">
          <div className="premium-card p-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Info icon={Mail} label="Email" value={owner.email} />
            <Info icon={Phone} label="Téléphone" value={owner.phone} />
            <Info icon={Building2} label="Société" value={owner.company} />
            <Info icon={MapPin} label="Adresse" value={[owner.address, owner.city].filter(Boolean).join(", ")} />
            <Info icon={IdCard} label="Pièce d'identité" value={[owner.id_type, owner.id_number].filter(Boolean).join(" · ")} />
            <Info icon={IdCard} label="NIF / RCCM" value={[owner.tax_number, owner.rccm].filter(Boolean).join(" · ")} />
            <Info icon={Landmark} label="Banque" value={[owner.bank_name, owner.bank_account].filter(Boolean).join(" · ")} />
            <Info icon={Smartphone} label="Mobile Money" value={[owner.mobile_money_provider, owner.mobile_money_number].filter(Boolean).join(" · ")} />
          </div>
          <div className="premium-card p-6">
            <div className="flex items-center gap-2 mb-2">
              <StickyNote className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Notes internes</h4>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{owner.notes || "Aucune note."}</p>
          </div>
        </TabsContent>

        <TabsContent value="properties" className="mt-6">
          {loadingProps ? (
            <Skeleton className="h-40 w-full" />
          ) : (properties ?? []).length === 0 ? (
            <EmptyState icon={Home} title="Aucun bien" description="Aucun bien n'est rattaché à ce propriétaire." />
          ) : (
            <div className="premium-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Référence</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Localisation</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(properties ?? []).map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.reference ?? "—"}</TableCell>
                      <TableCell>{p.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{[p.district, p.city].filter(Boolean).join(", ")}</TableCell>
                      <TableCell className="text-sm">{Number(p.price).toLocaleString("fr-FR")} {p.currency}</TableCell>
                      <TableCell>
                        <Badge variant={p.published ? "default" : "outline"}>{p.published ? "Publié" : p.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="mandates" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setMandateId(undefined); setMandateOpen(true); }}>
              <Plus className="h-4 w-4" /> Nouveau mandat
            </Button>
          </div>
          {loadingMandates ? (
            <Skeleton className="h-40 w-full" />
          ) : (mandates ?? []).length === 0 ? (
            <EmptyState icon={FileSignature} title="Aucun mandat" description="Créez un mandat pour formaliser la mise en gestion." />
          ) : (
            <div className="premium-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Référence</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Biens</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(mandates ?? []).map((m: any) => (
                    <TableRow key={m.id} className="group">
                      <TableCell className="font-medium">{m.reference}</TableCell>
                      <TableCell>
                        {typeLabels[m.mandate_type]} {m.exclusive && <Badge variant="secondary" className="ml-1 text-[10px]">Exclusif</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.start_date} {m.end_date ? `→ ${m.end_date}` : ""}</TableCell>
                      <TableCell className="text-sm">{m.commission_rate}%</TableCell>
                      <TableCell className="text-sm">{m.properties?.length ?? 0}</TableCell>
                      <TableCell><Badge variant={m.status === "active" ? "default" : "outline"}>{statusLabels[m.status]}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMandateId(m.id); setMandateOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => delMandate.mutate(m.id, { onSuccess: () => toast.success("Mandat supprimé"), onError: (e: any) => toast.error(e.message) })}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          {(documents ?? []).length === 0 ? (
            <EmptyState icon={FolderOpen} title="Aucun document" description="Les documents liés à ce propriétaire apparaîtront ici." />
          ) : (
            <div className="premium-card divide-y">
              {(documents ?? []).map((d: any) => (
                <a key={d.id} href={d.file_url} target="_blank" rel="noreferrer" className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <span className="text-sm font-medium">{d.name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(d.uploaded_at).toLocaleDateString("fr-FR")}</span>
                </a>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <OwnerFormDialog open={editOpen} onOpenChange={setEditOpen} ownerId={id} />
      <MandateFormDialog open={mandateOpen} onOpenChange={setMandateOpen} mandateId={mandateId} defaultOwnerId={id} />
    </PageShell>
  );
};

export default OwnerDetailPage;
