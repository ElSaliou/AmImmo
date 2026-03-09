import { useCallback, useState } from "react";
import { usePropertyImages, useUploadPropertyImage, useDeletePropertyImage, useReorderPropertyImages, useTogglePanorama } from "@/hooks/use-property-images";
import { ImagePlus, X, GripVertical, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PropertyImage } from "@/types/real-estate";

interface Props {
  propertyId: string;
}

/* ── Sortable image tile ── */
const SortableImage = ({
  image,
  index,
  onDelete,
  onTogglePanorama,
  deleting,
}: {
  image: PropertyImage;
  index: number;
  onDelete: (id: string) => void;
  onTogglePanorama: (id: string, current: boolean) => void;
  deleting: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square rounded-lg overflow-hidden border bg-muted
        ${isDragging ? "ring-2 ring-primary shadow-lg scale-105" : "border-border"}`}
    >
      <img
        src={image.url}
        alt={image.alt ?? `Photo ${index + 1}`}
        className="w-full h-full object-cover"
      />
      {/* Drag handle */}
      <button
        type="button"
        className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-foreground/70 backdrop-blur-sm text-background text-[10px] font-semibold px-1.5 py-0.5 rounded cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
        {index + 1}
      </button>
      {/* Delete */}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(image.id);
        }}
        disabled={deleting}
      >
        <X className="h-3 w-3" />
      </Button>
      {/* 360° toggle */}
      <Button
        type="button"
        size="icon"
        className={`absolute bottom-1.5 right-1.5 h-6 w-6 transition-opacity ${
          (image as any).is_panorama
            ? "bg-info text-info-foreground opacity-100"
            : "bg-foreground/50 text-background opacity-0 group-hover:opacity-100"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePanorama(image.id, !!(image as any).is_panorama);
        }}
        title={(image as any).is_panorama ? "Retirer le mode 360°" : "Marquer comme image 360°"}
      >
        <Globe className="h-3 w-3" />
      </Button>
      {/* Cover indicator */}
      {index === 0 && (
        <div className="absolute bottom-1.5 left-1.5 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded">
          Couverture
        </div>
      )}
      {/* 360 badge */}
      {(image as any).is_panorama && (
        <div className="absolute top-1.5 right-8 bg-info/90 backdrop-blur-sm text-info-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded">
          360°
        </div>
      )}
    </div>
  );
};

/* ── Main component ── */
const PropertyImageUpload = ({ propertyId }: Props) => {
  const { data: images, isLoading } = usePropertyImages(propertyId);
  const uploadMut = useUploadPropertyImage();
  const deleteMut = useDeletePropertyImage();
  const reorderMut = useReorderPropertyImages();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Local order for optimistic reorder
  const [localOrder, setLocalOrder] = useState<PropertyImage[] | null>(null);

  const displayImages = localOrder ?? images ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !images) return;

    const oldIndex = displayImages.findIndex((i) => i.id === active.id);
    const newIndex = displayImages.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(displayImages, oldIndex, newIndex);

    // Optimistic update
    setLocalOrder(reordered);

    reorderMut.mutate(
      { propertyId, orderedIds: reordered.map((i) => i.id) },
      {
        onSuccess: () => setLocalOrder(null),
        onError: () => {
          setLocalOrder(null);
          toast.error("Erreur lors du réordonnancement");
        },
      }
    );
  };

  // Reset local order when images change from server
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (fileArray.length === 0) {
        toast.error("Seules les images sont acceptées");
        return;
      }
      setUploading(true);
      const nextPosition = displayImages.length;
      try {
        await Promise.all(
          fileArray.map((file, i) =>
            uploadMut.mutateAsync({ propertyId, file, position: nextPosition + i })
          )
        );
        setLocalOrder(null);
        toast.success(
          `${fileArray.length} image${fileArray.length > 1 ? "s" : ""} ajoutée${fileArray.length > 1 ? "s" : ""}`
        );
      } catch (err: any) {
        toast.error(err.message ?? "Erreur lors de l'upload");
      } finally {
        setUploading(false);
      }
    },
    [propertyId, displayImages, uploadMut]
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
    setLocalOrder(null);
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
          ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
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
              JPG, PNG, WebP — max 5 MB · Glissez les vignettes pour réordonner
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

      {/* Image grid with DnD sorting */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : displayImages.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={displayImages.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {displayImages.map((img, idx) => (
                <SortableImage
                  key={img.id}
                  image={img}
                  index={idx}
                  onDelete={handleDelete}
                  deleting={deleteMut.isPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : null}
    </div>
  );
};

export default PropertyImageUpload;
