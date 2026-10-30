import {
  useMemo,
  useState,
} from "react";

import {
  Eye,
  Inbox,
  Mail,
  Search,
} from "lucide-react";

import PageShell from "@/components/PageShell";
import EmptyState from "@/components/admin/EmptyState";
import TableSkeleton from "@/components/admin/TableSkeleton";
import QuoteRequestDetailDialog from "@/components/admin/QuoteRequestDetailDialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

import {
  useQuoteRequests,
  type QuoteRequestWithRelations,
} from "@/hooks/use-quote-requests";

import {
  useServices,
} from "@/hooks/use-services";

import type {
  QuoteRequestStatus,
} from "@/types/real-estate";

const statusLabels: Record<
  QuoteRequestStatus,
  string
> = {
  new: "Nouvelle",
  in_progress: "En cours",
  answered: "Répondue",
  closed: "Clôturée",
  cancelled: "Annulée",
};

const statusClasses: Record<
  QuoteRequestStatus,
  string
> = {
  new:
    "bg-primary/15 text-primary",

  in_progress:
    "bg-warning/15 text-warning",

  answered:
    "bg-success/15 text-success",

  closed:
    "bg-muted text-muted-foreground",

  cancelled:
    "bg-destructive/15 text-destructive",
};

const formatDate = (
  value: string,
) =>
  new Intl.DateTimeFormat(
    "fr-FR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );

const QuoteRequestsPage = () => {
  const {
    data: quoteRequests = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuoteRequests();

  const {
    data: services = [],
  } = useServices();

  const [
    selectedRequest,
    setSelectedRequest,
  ] =
    useState<QuoteRequestWithRelations | null>(
      null,
    );

  const [
    dialogOpen,
    setDialogOpen,
  ] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      QuoteRequestStatus | "__all__"
    >("__all__");

  const [
    serviceFilter,
    setServiceFilter,
  ] =
    useState<string>(
      "__all__",
    );

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return quoteRequests.filter(
        (request) => {
          if (
            statusFilter !==
              "__all__" &&
            request.status !==
              statusFilter
          ) {
            return false;
          }

          if (
            serviceFilter !==
              "__all__" &&
            request.service_id !==
              serviceFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            request.customer_name,
            request.customer_email,
            request.customer_phone,
            request.subject,
            request.service?.title,
          ].some((value) =>
            String(
              value ?? "",
            )
              .toLowerCase()
              .includes(query),
          );
        },
      );
    }, [
      quoteRequests,
      search,
      statusFilter,
      serviceFilter,
    ]);

  const newCount =
    quoteRequests.filter(
      (request) =>
        request.status === "new",
    ).length;

  const inProgressCount =
    quoteRequests.filter(
      (request) =>
        request.status ===
        "in_progress",
    ).length;

  const answeredCount =
    quoteRequests.filter(
      (request) =>
        request.status ===
        "answered",
    ).length;

  const openDetail = (
    request: QuoteRequestWithRelations,
  ) => {
    setSelectedRequest(
      request,
    );

    setDialogOpen(true);
  };

  return (
    <PageShell
      title="Demandes de devis"
      subtitle="Suivi et traitement des demandes commerciales reçues"
    >
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="premium-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total
          </p>

          <p className="mt-2 text-2xl font-bold">
            {
              quoteRequests.length
            }
          </p>
        </div>

        <div className="premium-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Nouvelles
          </p>

          <p className="mt-2 text-2xl font-bold">
            {newCount}
          </p>
        </div>

        <div className="premium-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            En cours
          </p>

          <p className="mt-2 text-2xl font-bold">
            {inProgressCount}
          </p>
        </div>

        <div className="premium-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Répondues
          </p>

          <p className="mt-2 text-2xl font-bold">
            {answeredCount}
          </p>
        </div>
      </div>

      <div className="premium-card mb-6 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_260px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              className="pl-9"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Client, email, téléphone, objet..."
            />
          </div>

          <Select
            value={
              statusFilter
            }
            onValueChange={(value) =>
              setStatusFilter(
                value as
                  | QuoteRequestStatus
                  | "__all__",
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="__all__">
                Tous les statuts
              </SelectItem>

              <SelectItem value="new">
                Nouvelles
              </SelectItem>

              <SelectItem value="in_progress">
                En cours
              </SelectItem>

              <SelectItem value="answered">
                Répondues
              </SelectItem>

              <SelectItem value="closed">
                Clôturées
              </SelectItem>

              <SelectItem value="cancelled">
                Annulées
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={
              serviceFilter
            }
            onValueChange={
              setServiceFilter
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes les prestations" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="__all__">
                Toutes les prestations
              </SelectItem>

              {services.map(
                (service) => (
                  <SelectItem
                    key={
                      service.id
                    }
                    value={
                      service.id
                    }
                  >
                    {
                      service.title
                    }
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>

        {!isLoading &&
          !isError && (
            <p className="mt-3 text-xs text-muted-foreground">
              {filtered.length} demande
              {filtered.length > 1
                ? "s"
                : ""}
            </p>
          )}
      </div>

      {isLoading ? (
        <TableSkeleton
          rows={6}
          columns={7}
        />
      ) : isError ? (
        <div className="premium-card p-8 text-center">
          <Inbox className="mx-auto h-8 w-8 text-destructive" />

          <h3 className="mt-4 font-semibold">
            Impossible de charger les demandes de devis
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Une erreur inconnue est survenue."}
          </p>

          <Button
            variant="outline"
            className="mt-5"
            onClick={() =>
              refetch()
            }
          >
            Réessayer
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            quoteRequests.length === 0
              ? "Aucune demande de devis"
              : "Aucun résultat"
          }
          description={
            quoteRequests.length === 0
              ? "Les demandes de devis apparaîtront ici lorsqu'elles seront reçues."
              : "Aucune demande ne correspond aux filtres actuels."
          }
        />
      ) : (
        <div className="premium-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>
                  Client
                </TableHead>

                <TableHead>
                  Contact
                </TableHead>

                <TableHead>
                  Prestation
                </TableHead>

                <TableHead>
                  Objet
                </TableHead>

                <TableHead>
                  Reçue le
                </TableHead>

                <TableHead>
                  Statut
                </TableHead>

                <TableHead className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filtered.map(
                (request) => (
                  <TableRow
                    key={
                      request.id
                    }
                    className={
                      request.status ===
                      "new"
                        ? "bg-primary/[0.03]"
                        : undefined
                    }
                  >
                    <TableCell>
                      <p className="font-medium">
                        {
                          request.customer_name
                        }
                      </p>

                      {request.lead && (
                        <p className="mt-1 text-xs text-success">
                          Prospect CRM
                        </p>
                      )}
                    </TableCell>

                    <TableCell>
                      {request.customer_email ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />

                          <span className="max-w-48 truncate">
                            {
                              request.customer_email
                            }
                          </span>
                        </div>
                      ) : (
                        request.customer_phone ??
                        "—"
                      )}
                    </TableCell>

                    <TableCell>
                      {request.service
                        ?.title ??
                        "—"}
                    </TableCell>

                    <TableCell>
                      <span className="block max-w-56 truncate">
                        {request.subject ||
                          "Demande de devis"}
                      </span>
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(
                        request.created_at,
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={
                          statusClasses[
                            request.status
                          ]
                        }
                      >
                        {
                          statusLabels[
                            request.status
                          ]
                        }
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ouvrir"
                        onClick={() =>
                          openDetail(
                            request,
                          )
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <QuoteRequestDetailDialog
        open={dialogOpen}
        onOpenChange={(
          open,
        ) => {
          setDialogOpen(open);

          if (!open) {
            setSelectedRequest(
              null,
            );
          }
        }}
        quoteRequest={
          selectedRequest
        }
      />
    </PageShell>
  );
};

export default QuoteRequestsPage;