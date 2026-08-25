import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import PageShell from "@/components/PageShell";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import BuildingFormDialog from "@/components/admin/BuildingFormDialog";

import {
  useBuildings,
  useDeleteBuilding,
  type BuildingWithOwner,
} from "@/hooks/use-buildings";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { conakryCommunes } from "@/constants/real-estate";
import type { Building } from "@/types/real-estate";

const BuildingsPage = () => {
  const {
    data: buildings = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useBuildings();

  const deleteBuilding = useDeleteBuilding();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);

  const [search, setSearch] = useState("");
  const [commune, setCommune] = useState("__all__");

  /**
   * Recherche et filtres.
   *
   * Utilisation de String(... ?? "") pour éviter une erreur runtime
   * si city/district/commune sont NULL dans PostgreSQL.
   */
  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return buildings.filter((building) => {
      const name = String(building.name ?? "").toLowerCase();
      const city = String(building.city ?? "").toLowerCase();
      const district = String(building.district ?? "").toLowerCase();
      const buildingCommune = String(
        building.commune ?? "",
      ).toLowerCase();

      if (
        normalizedSearch &&
        !name.includes(normalizedSearch) &&
        !city.includes(normalizedSearch) &&
        !district.includes(normalizedSearch) &&
        !buildingCommune.includes(normalizedSearch)
      ) {
        return false;
      }

      if (
        commune !== "__all__" &&
        building.commune !== commune
      ) {
        return false;
      }

      return true;
    });
  }, [buildings, search, commune]);

  const totalUnits = useMemo(
    () =>
      filtered.reduce(
        (total, building) =>
          total + Number(building.total_units ?? 0),
        0,
      ),
    [filtered],
  );

  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleEdit = (building: BuildingWithOwner) => {
    setEditing(building as Building);
    setOpen(true);
  };

  const handleDelete = (building: BuildingWithOwner) => {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer l'immeuble "${building.name}" ?`,
    );

    if (!confirmed) {
      return;
    }

    deleteBuilding.mutate(building.id, {
      onSuccess: () => {
        toast.success("Immeuble supprimé");
      },

      onError: (deleteError) => {
        toast.error(
          deleteError instanceof Error
            ? deleteError.message
            : "Impossible de supprimer l'immeuble.",
        );
      },
    });
  };

  return (
    <PageShell
      title="Immeubles"
      subtitle="Gestion du patrimoine bâti"
      actions={
        <Button onClick={handleCreate} variant="premium">
          <Plus className="h-4 w-4" />
          Ajouter
        </Button>
      }
    >
      {/* Recherche / filtres */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="premium-card mb-6 p-4"
      >
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Rechercher par nom, ville, commune ou quartier..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="h-10 pl-9"
            />
          </div>

          <Select
            value={commune}
            onValueChange={setCommune}
          >
            <SelectTrigger className="h-10 md:w-48">
              <SelectValue placeholder="Commune" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="__all__">
                Toutes les communes
              </SelectItem>

              {conakryCommunes.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isLoading &&
          !isError &&
          filtered.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {filtered.length} immeuble
              {filtered.length > 1 ? "s" : ""}
              {" · "}
              {totalUnits} unité
              {totalUnits > 1 ? "s" : ""} déclarée
              {totalUnits > 1 ? "s" : ""}
            </p>
          )}
      </motion.div>

      {/* Loading */}
      {isLoading ? (
        <TableSkeleton rows={4} columns={7} />
      ) : isError ? (
        /* Erreur réelle Supabase visible */
        <div className="premium-card p-8">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <Building2 className="h-6 w-6 text-destructive" />
            </div>

            <h3 className="text-lg font-semibold">
              Impossible de charger les immeubles
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Une erreur inconnue est survenue lors de la lecture de Supabase."}
            </p>

            <Button
              variant="outline"
              className="mt-5"
              onClick={() => refetch()}
            >
              Réessayer
            </Button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        /* État vide */
        <EmptyState
          icon={Building2}
          title={
            buildings.length === 0
              ? "Aucun immeuble"
              : "Aucun résultat"
          }
          description={
            search || commune !== "__all__"
              ? "Aucun immeuble ne correspond à vos critères. Modifiez vos filtres."
              : "Ajoutez votre premier immeuble pour commencer."
          }
        />
      ) : (
        /* Tableau */
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">
                  Nom
                </TableHead>

                <TableHead className="font-semibold">
                  Localisation
                </TableHead>

                <TableHead className="font-semibold">
                  Propriétaire
                </TableHead>

                <TableHead className="font-semibold">
                  Étages
                </TableHead>

                <TableHead className="font-semibold">
                  Unités
                </TableHead>

                <TableHead className="font-semibold">
                  GPS
                </TableHead>

                <TableHead className="text-right font-semibold">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map((building) => (
                <TableRow
                  key={building.id}
                  className="group transition-colors hover:bg-muted/30"
                >
                  {/* Nom */}
                  <TableCell>
                    <p className="text-sm font-medium">
                      {building.name || "Sans nom"}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {building.address || "—"}
                    </p>
                  </TableCell>

                  {/* Localisation */}
                  <TableCell className="text-sm">
                    <div className="flex flex-col">
                      <span>
                        {building.city || "—"}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {[
                          building.commune,
                          building.district,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Propriétaire */}
                  <TableCell className="text-sm">
                    {building.owner?.full_name || "—"}
                  </TableCell>

                  {/* Étages */}
                  <TableCell className="text-sm">
                    {building.floors ?? 0}
                  </TableCell>

                  {/* Unités */}
                  <TableCell className="text-sm">
                    {building.total_units ?? 0}
                  </TableCell>

                  {/* GPS */}
                  <TableCell>
                    {building.latitude != null &&
                    building.longitude != null ? (
                      <Badge
                        variant="outline"
                        className="text-xs"
                      >
                        <MapPin className="mr-1 h-3 w-3" />
                        Géolocalisé
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        —
                      </span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Modifier"
                        onClick={() =>
                          handleEdit(building)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Supprimer"
                        disabled={deleteBuilding.isPending}
                        onClick={() =>
                          handleDelete(building)
                        }
                      >
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

      {/* Formulaire */}
      <BuildingFormDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);

          if (!value) {
            setEditing(null);
          }
        }}
        building={editing}
      />
    </PageShell>
  );
};

export default BuildingsPage;
