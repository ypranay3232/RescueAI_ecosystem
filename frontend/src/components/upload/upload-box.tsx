"use client";

import { cn } from "@/lib/utils";
import { Upload, X, ImageIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

interface UploadBoxProps {
  onUpload: (file: File) => void;
  accept?: string;
  loading?: boolean;
  className?: string;
}

export function UploadBox({ onUpload, accept = "image/*", loading, className }: UploadBoxProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      setPreview(URL.createObjectURL(file));
      onUpload(file);
    },
    [onUpload]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-colors",
        dragging ? "border-orange-500 bg-orange-500/5" : "border-border/60 bg-muted/20",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {preview ? (
        <div className="relative p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Upload preview" className="max-h-64 w-full rounded-lg object-cover" />
          <Button
            size="icon-sm"
            variant="secondary"
            className="absolute right-6 top-6"
            onClick={() => setPreview(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-3 p-10">
          <div className="rounded-full bg-orange-500/10 p-4">
            {loading ? (
              <Upload className="h-8 w-8 animate-bounce text-orange-400" />
            ) : (
              <ImageIcon className="h-8 w-8 text-orange-400" />
            )}
          </div>
          <div className="text-center">
            <p className="font-medium">Drop drone footage here</p>
            <p className="mt-1 text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
          </div>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      )}
    </div>
  );
}
