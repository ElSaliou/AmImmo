import PageShell from "@/components/PageShell";
import { useLeads, useUpdateLead } from "@/hooks/use-leads";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { LeadStatus } from "@/types/real-estate";

const statusOptions: LeadStatus[] = ["new", "contacted", "qualified", "converted", "lost"];

const LeadsPage = () => {
  const { data: leads, isLoading } = useLeads();
  const updateLead = useUpdateLead();

  const handleStatusChange = (id: string, status: LeadStatus) => {
    updateLead.mutate({ id, status }, { onSuccess: () => toast.success("Statut mis à jour") });
  };

  return (
    <PageShell title="Leads" subtitle="Demandes et prospects entrants">
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement...</p>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Bien</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(leads ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.full_name}</TableCell>
                  <TableCell>{l.email}</TableCell>
                  <TableCell>{l.phone ?? "—"}</TableCell>
                  <TableCell>{(l as any).property?.title ?? "—"}</TableCell>
                  <TableCell>{l.source}</TableCell>
                  <TableCell>
                    <Select value={l.status} onValueChange={(v) => handleStatusChange(l.id, v as LeadStatus)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(l.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))}
              {(leads ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun lead</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </PageShell>
  );
};

export default LeadsPage;
