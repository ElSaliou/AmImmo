import { useEffect, useRef } from "react";

interface Props {
  imageUrl: string;
  className?: string;
}

const PanoramaViewer = ({ imageUrl, className = "" }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load Pannellum CSS
    if (!document.getElementById("pannellum-css")) {
      const link = document.createElement("link");
      link.id = "pannellum-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
      document.head.appendChild(link);
    }

    // Load Pannellum JS
    const loadViewer = () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      viewerRef.current = (window as any).pannellum.viewer(containerRef.current!, {
        type: "equirectangular",
        panorama: imageUrl,
        autoLoad: true,
        autoRotate: -2,
        compass: false,
        showZoomCtrl: true,
        showFullscreenCtrl: true,
        mouseZoom: true,
        hfov: 110,
      });
    };

    if ((window as any).pannellum) {
      loadViewer();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
      script.onload = loadViewer;
      document.head.appendChild(script);
    }

    return () => {
      if (viewerRef.current) {
        try { viewerRef.current.destroy(); } catch {}
        viewerRef.current = null;
      }
    };
  }, [imageUrl]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-2xl overflow-hidden ${className}`}
      style={{ height: "100%" }}
    />
  );
};

export default PanoramaViewer;
