import { useCallback, useState } from "react";
import {
  usePropertyVideos,
  useUploadPropertyVideo,
  useDeletePropertyVideo,
} from "@/hooks/use-property-videos";
import { Video, X, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Props {
  propertyId: string;
  videoType?: "standard" | "tour_360";
}

const PropertyVideoUpload = ({ propertyId, videoType = "standard" }: Props) => {
  const { data: allVideos, isLoading } = usePropertyVideos(propertyId);
  const uploadMut = useUploadPropertyVideo();
  const deleteMut = useDeletePropertyVideo();
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const videos = (allVideos ?? []).filter((v) => v.video_type === videoType);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter((f) =>
        f.type.startsWith("video/")
      );
      if (fileArray.length === 0) {
        toast.error("Seuls les fichiers vidéo sont acceptés");
        return;
      }
      // Max 100MB per file
      const tooLarge = fileArray.find((f) => f.size > 100 * 1024 * 1024);
      if (tooLarge) {
        toast.error("Taille max par vidéo : 100 MB");
        return;
      }
      setUploading(true);
      const nextPosition = videos.length;
      try {
        await Promise.all(
          fileArray.map((file, i) =>
            uploadMut.mutateAsync({
              propertyId,
              file,
              position: nextPosition + i,
              videoType,
              title: file.name.replace(/\.[^.]+$/, ""),
            })
          )
        );
        toast.success(
          `${fileArray.length} vidéo${fileArray.length > 1 ? "s" : ""} ajoutée${fileArray.length > 1 ? "s" : ""}`
        );
      } catch (err: any) {
        toast.error(err.message ?? "Erreur lors de l'upload");
      } finally {
        setUploading(false);
      }
    },
    [propertyId, videos, uploadMut, videoType]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles]
  );

  const inputId = `video-upload-${videoType}`;

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer
          ${isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Upload en cours…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            {videoType === "tour_360" ? (
              <Globe className="h-7 w-7 text-muted-foreground/40" />
            ) : (
              <Video className="h-7 w-7 text-muted-foreground/40" />
            )}
            <p className="text-sm font-medium text-muted-foreground">
              Glissez vos {videoType === "tour_360" ? "visites 360°" : "vidéos"} ici ou{" "}
              <span className="text-primary underline underline-offset-2">
                parcourir
              </span>
            </p>
            <p className="text-xs text-muted-foreground/60">
              MP4, MOV, WebM — max 100 MB
            </p>
          </div>
        )}
        <input
          id={inputId}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={onFileInput}
        />
      </div>

      {/* Video list */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-16 bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : videos.length > 0 ? (
        <div className="space-y-2">
          {videos.map((v) => (
            <div
              key={v.id}
              className="group flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                {videoType === "tour_360" ? (
                  <Globe className="h-4 w-4 text-info" />
                ) : (
                  <Video className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {v.title || "Vidéo sans titre"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {v.url.split("/").pop()}
                </p>
              </div>
              {videoType === "tour_360" && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-info/10 text-info border-info/20"
                >
                  360°
                </Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() =>
                  deleteMut.mutate(
                    { id: v.id, propertyId },
                    { onSuccess: () => toast.success("Vidéo supprimée") }
                  )
                }
                disabled={deleteMut.isPending}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default PropertyVideoUpload;
