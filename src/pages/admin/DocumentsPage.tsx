import { useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, FileText, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

import PageShell from "@/components/PageShell";
import TableSkeleton from "@/components/admin/TableSkeleton";
import EmptyState from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import {
  createDocumentAccessUrl,
  useDocuments,
} from "@/hooks/use-documents";
import type { Document as DocumentRecord } from "@/types/real-estate";

const fileTypeIcon: Record<string, string> = {
  pdf: "📄",
  image: "🖼️",
  doc: "📝",
};

const DocumentsPage = () => {
  const { data: documents, isLoading } = useDocuments();

  const [
    openingDocumentId,
    setOpeningDocumentId,
  ] = useState<string | null>(null);

  const handleOpenDocument =
    async (
      document: DocumentRecord,
    ) => {
      const popup =
        window.open(
          "about:blank",
          "_blank",
        );

      if (!popup) {
        toast.error(
          "Autorisez les fenêtres contextuelles pour ouvrir ce document.",
        );

        return;
      }

      popup.opener = null;

      setOpeningDocumentId(
        document.id,
      );

      try {
        const url =
          await createDocumentAccessUrl(
            document,
          );

        popup.location.href =
          url;
      } catch (
        error: unknown
      ) {
        popup.close();

        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible d'ouvrir ce document.",
        );
      } finally {
        setOpeningDocumentId(
          null,
        );
      }
    };

  return (
    <PageShell title="Documents" subtitle="Gestion documentaire centralisée">
      {isLoading ? (
        <TableSkeleton rows={4} columns={3} />
      ) : (documents ?? []).length === 0 ? (
        <EmptyState icon={FolderOpen} title="Aucun document" description="Les documents associés aux biens et contrats apparaîtront ici." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents!.map((d, i) => (
            <motion.button
              key={d.id}
              type="button"
              disabled={
                openingDocumentId ===
                d.id
              }
              onClick={() =>
                void handleOpenDocument(
                  d,
                )
              }
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="premium-card p-5 group flex w-full items-start gap-4 text-left disabled:opacity-60"
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg">
                {fileTypeIcon[d.file_type] ?? <FileText className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">{d.name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-xs capitalize">{d.entity_type}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(d.uploaded_at).toLocaleDateString("fr-FR")}</span>
                </div>
              </div>
              {openingDocumentId ===
              d.id ? (
                <Loader2 className="h-4 w-4 shrink-0 mt-1 animate-spin text-muted-foreground" />
              ) : (
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
              )}
            </motion.button>
          ))}
        </div>
      )}
    </PageShell>
  );
};

export default DocumentsPage;
