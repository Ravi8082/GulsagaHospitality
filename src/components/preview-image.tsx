import { useEffect, useState } from "react";
import { resortFallback } from "@/lib/hotel-data";

export function PreviewImage({
  src,
  alt,
  width,
  height,
  className,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const [imageSource, setImageSource] = useState(src);

  useEffect(() => {
    setImageSource(src);
  }, [src]);

  return (
    <img
      src={imageSource}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      onError={() =>
        setImageSource((current) => (current === resortFallback ? current : resortFallback))
      }
    />
  );
}
