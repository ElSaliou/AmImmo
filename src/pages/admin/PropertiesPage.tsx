import PageShell from "@/components/PageShell";
import { useProperties, useDeleteProperty, useTogglePublish } from "@/hooks/use-properties";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, EyeOff, Pencil, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import PropertyFormDialog from "@/components/admin/PropertyFormDialog";
import { toast } from "sonner";

const PropertiesPage = () => {
  const { data: properties, isLoading } = useProperties();
  const deleteProp = useDeleteProperty();
  const togglePublish = useTogglePublish();
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    published: "bg-success text-success-foreground",
    archived: "bg-destructive/20 text-destructive",
    rented: "bg-secondary text-secondary-foreground",
    sold: "bg-primary text-primary-foreground",
  };

  return (
    <PageShell title="Biens immobiliers" subtitle="Gestion de l'inventaire des biens">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditId(undefined); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Ajouter un bien
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Chargement...</div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Offre</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(properties ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="capitalize">{p.property_type}</TableCell>
                  <TableCell className="capitalize">{p.listing_type?.replace("_", " ")}</TableCell>
                  <TableCell>{Number(p.price).toLocaleString()} {p.currency}</TableCell>
                  <TableCell>{p.city}</TableCell>
                  <TableCell>
                    <Badge className={statusColor[p.status] ?? ""} variant="secondary">
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        togglePublish.mutate(
                          { id: p.id, published: !p.published },
                          { onSuccess: () => toast.success(p.published ? "Bien dépublié" : "Bien publié") }
                        );
                      }}
                      title={p.published ? "Dépublier" : "Publier"}
                    >
                      {p.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditId(p.id); setFormOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteProp.mutate(p.id, { onSuccess: () => toast.success("Bien supprimé") })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(properties ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucun bien enregistré
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <PropertyFormDialog open={formOpen} onOpenChange={setFormOpen} propertyId={editId} />
    </PageShell>
  );
};

export default PropertiesPage;
