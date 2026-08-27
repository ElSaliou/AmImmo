import PageShell from "@/components/PageShell";

import {
  useLeads,
  useUpdateLead,
} from "@/hooks/use-leads";

import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";

import { toast } from "sonner";

import {
  useMemo,
  useState,
} from "react";

import {
  Search,
  MessageSquare,
  ChevronRight,
} from "lucide-react";

import { motion } from "framer-motion";

import type {
  Lead,
  LeadStatus,
} from "@/types/real-estate";

import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import LeadDetailDialog from "@/components/admin/LeadDetailDialog";

const statusOptions: {
  value: LeadStatus;
  label: string;
}[] = [
  {
    value: "new",
    label: "Nouveau",
  },
  {
    value: "contacted",
    label: "Contacté",
  },
  {
    value: "qualified",
    label: "Qualifié",
  },
  {
    value: "visit_scheduled",
    label: "Visite programmée",
  },
  {
    value: "visit_done",
    label: "Visite effectuée",
  },
  {
    value: "application_received",
    label: "Dossier reçu",
  },
  {
    value: "negotiation",
    label: "Négociation",
  },
  {
    value: "converted",
    label: "Converti",
  },
  {
    value: "lost",
    label: "Perdu",
  },
];

const statusColor: Record<
  string,
  string
> = {
  new: "bg-info/15 text-info",
  contacted:
    "bg-warning/15 text-warning",
  qualified:
    "bg-secondary/15 text-secondary",

  visit_scheduled:
    "bg-blue-500/15 text-blue-700",

  visit_done:
    "bg-indigo-500/15 text-indigo-700",

  application_received:
    "bg-purple-500/15 text-purple-700",

  negotiation:
    "bg-orange-500/15 text-orange-700",

  converted:
    "bg-success/15 text-success",

  lost:
    "bg-destructive/15 text-destructive",
};

type LeadWithProperty = Lead & {
  property?: {
    id: string;
    title: string;
    city?: string;
    commune?: string;
    slug?: string;
  } | null;
};

const LeadsPage = () => {
  const {
    data: leads,
    isLoading,
  } = useLeads();

  const updateLead =
    useUpdateLead();

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filterStatus,
    setFilterStatus,
  ] = useState("__all__");

  const [
    selectedLead,
    setSelectedLead,
  ] =
    useState<LeadWithProperty | null>(
      null,
    );

  const [
    detailOpen,
    setDetailOpen,
  ] = useState(false);

  const filtered = useMemo(() => {
    if (!leads) {
      return [];
    }

    return leads.filter(
      (lead) => {
        const query =
          search
            .trim()
            .toLowerCase();

        if (query) {
          const matchesName =
            lead.full_name
              ?.toLowerCase()
              .includes(query);

          const matchesEmail =
            lead.email
              ?.toLowerCase()
              .includes(query);

          const matchesPhone =
            lead.phone
              ?.toLowerCase()
              .includes(query);

          const propertyTitle = (
            lead as LeadWithProperty
          ).property?.title;

          const matchesProperty =
            propertyTitle
              ?.toLowerCase()
              .includes(query);

          if (
            !matchesName &&
            !matchesEmail &&
            !matchesPhone &&
            !matchesProperty
          ) {
            return false;
          }
        }

        if (
          filterStatus !==
            "__all__" &&
          lead.status !==
            filterStatus
        ) {
          return false;
        }

        return true;
      },
    );
  }, [
    leads,
    search,
    filterStatus,
  ]);

  const openLead = (
    lead: LeadWithProperty,
  ) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  return (
    <PageShell
      title="Leads"
      subtitle="Demandes et prospects entrants"
    >
      <div className="premium-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

            <Input
              placeholder="Rechercher par nom, email, téléphone ou bien..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              className="pl-9 h-10"
            />
          </div>

          <Select
            value={filterStatus}
            onValueChange={
              setFilterStatus
            }
          >
            <SelectTrigger className="md:w-52 h-10">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="__all__">
                Tous les statuts
              </SelectItem>

              {statusOptions.map(
                (status) => (
                  <SelectItem
                    key={
                      status.value
                    }
                    value={
                      status.value
                    }
                  >
                    {
                      status.label
                    }
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        {filtered.length >
          0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {
              filtered.length
            }{" "}
            prospect
            {filtered.length >
            1
              ? "s"
              : ""}
          </p>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton
          rows={5}
          columns={7}
        />
      ) : filtered.length ===
        0 ? (
        <EmptyState
          icon={
            MessageSquare
          }
          title="Aucun lead trouvé"
          description={
            search ||
            filterStatus !==
              "__all__"
              ? "Modifiez vos filtres."
              : "Les demandes du site public apparaîtront ici."
          }
        />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">
                  Contact
                </TableHead>

                <TableHead className="font-semibold">
                  Téléphone
                </TableHead>

                <TableHead className="font-semibold">
                  Bien
                </TableHead>

                <TableHead className="font-semibold">
                  Source
                </TableHead>

                <TableHead className="font-semibold">
                  Statut
                </TableHead>

                <TableHead className="font-semibold">
                  Date
                </TableHead>

                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map(
                (
                  lead,
                  index,
                ) => {
                  const typedLead =
                    lead as LeadWithProperty;

                  return (
                    <motion.tr
                      key={
                        lead.id
                      }
                      initial={{
                        opacity: 0,
                      }}
                      animate={{
                        opacity: 1,
                      }}
                      transition={{
                        delay:
                          index *
                          0.02,
                      }}
                      onClick={() =>
                        openLead(
                          typedLead,
                        )
                      }
                      className="group cursor-pointer hover:bg-muted/40 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {lead.full_name
                              .charAt(
                                0,
                              )
                              .toUpperCase()}
                          </div>

                          <div>
                            <p className="font-medium text-sm group-hover:text-primary transition-colors">
                              {
                                lead.full_name
                              }
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {
                                lead.email
                              }
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm">
                        {lead.phone ??
                          "—"}
                      </TableCell>

                      <TableCell className="text-sm">
                        {typedLead
                          .property
                          ?.title ??
                          "—"}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs capitalize"
                        >
                          {
                            lead.source
                          }
                        </Badge>
                      </TableCell>

                      <TableCell
                        onClick={(
                          event,
                        ) =>
                          event.stopPropagation()
                        }
                      >
                        <Select
                          value={
                            lead.status
                          }
                          onValueChange={(
                            value,
                          ) =>
                            updateLead.mutate(
                              {
                                id: lead.id,
                                status:
                                  value as LeadStatus,
                              },
                              {
                                onSuccess:
                                  () =>
                                    toast.success(
                                      "Statut mis à jour",
                                    ),
                              },
                            )
                          }
                        >
                          <SelectTrigger className="w-44 h-8 text-xs">
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  statusColor[
                                    lead
                                      .status
                                  ]?.split(
                                    " ",
                                  )[0] ??
                                  "bg-muted"
                                }`}
                              />

                              <SelectValue />
                            </div>
                          </SelectTrigger>

                          <SelectContent>
                            {statusOptions.map(
                              (
                                status,
                              ) => (
                                <SelectItem
                                  key={
                                    status.value
                                  }
                                  value={
                                    status.value
                                  }
                                >
                                  {
                                    status.label
                                  }
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(
                          lead.created_at,
                        ).toLocaleDateString(
                          "fr-FR",
                        )}
                      </TableCell>

                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </TableCell>
                    </motion.tr>
                  );
                },
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <LeadDetailDialog
        open={detailOpen}
        onOpenChange={
          setDetailOpen
        }
        lead={selectedLead}
      />
    </PageShell>
  );
};

export default LeadsPage;
