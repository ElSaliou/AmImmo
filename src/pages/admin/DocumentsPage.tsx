import PageShell from "@/components/PageShell";
import { useDocuments } from "@/hooks/use-documents";

const DocumentsPage = () => {
  const { data: documents, isLoading } = useDocuments();

  return (
    <PageShell title="Documents" subtitle="Gestion documentaire centralisée">
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement...</p>
      ) : (documents ?? []).length === 0 ? (
        <p className="text-muted-foreground">Aucun document enregistré.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents!.map((d) => (
            <a key={d.id} href={d.file_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
              <p className="font-medium text-foreground">{d.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{d.entity_type} — {d.file_type}</p>
              <p className="text-xs text-muted-foreground">{new Date(d.uploaded_at).toLocaleDateString("fr-FR")}</p>
            </a>
          ))}
        </div>
      )}
    </PageShell>
  );
};

export default DocumentsPage;
