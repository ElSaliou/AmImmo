import { useCallback, useState } from "react";
import { usePropertyImages, useUploadPropertyImage, useDeletePropertyImage } from "@/hooks/use-property-images";
import { ImagePlus, X, GripVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  propertyId: string;
}

const PropertyImageUpload = ({ propertyId }: Props) => {
  const { data: images, isLoading } = usePropertyImages(propertyId);
  const uploadMut = useUploadPropertyImage();
  const deleteMut = useDeletePropertyImage();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (fileArray.length === 0) {
        toast.error("Seules les images sont acceptées");
        return;
      }
      setUploading(true);
      const nextPosition = (images?.length ?? 0);
      try {
        await Promise.all(
          fileArray.map((file, i) =>
            uploadMut.mutateAsync({
              propertyId,
              file,
              position: nextPosition + i,
            })
          )
        );
        toast.success(
          `${fileArray.length} image${fileArray.length > 1 ? "s" : ""} ajoutée${fileArray.length > 1 ? "s" : ""}`
        );
      } catch (err: any) {
        toast.error(err.message ?? "Erreur lors de l'upload");
      } finally {
        setUploading(false);
      }
    },
    [propertyId, images, uploadMut]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles]
  );

  const handleDelete = (imageId: string) => {
    deleteMut.mutate(
      { id: imageId, propertyId },
      { onSuccess: () => toast.success("Image supprimée") }
    );
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Photos du bien</label>

      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
          ${isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        onClick={() => document.getElementById("img-upload-input")?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Upload en cours…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              Glissez vos images ici ou{" "}
              <span className="text-primary underline underline-offset-2">parcourir</span>
            </p>
            <p className="text-xs text-muted-foreground/60">
              JPG, PNG, WebP — max 5 MB par image
            </p>
          </div>
        )}
        <input
          id="img-upload-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFileInput}
        />
      </div>

      {/* Image grid */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (images?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {images!.map((img, idx) => (
              <motion.div
                key={img.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
              >
                <img
                  src={img.url}
                  alt={img.alt ?? `Photo ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Position badge */}
                <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-foreground/70 backdrop-blur-sm text-background text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  <GripVertical className="h-3 w-3" />
                  {idx + 1}
                </div>
                {/* Delete button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(img.id);
                  }}
                  disabled={deleteMut.isPending}
                >
                  <X className="h-3 w-3" />
                </Button>
                {/* Cover indicator */}
                {idx === 0 && (
                  <div className="absolute bottom-1.5 left-1.5 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded">
                    Couverture
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  );
};

export default PropertyImageUpload;
