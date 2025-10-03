"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACCEPT } from "./constants";

export default function FilePicker({
  fileName,
  onChoose,
}: {
  fileName: string | null;
  onChoose: (file: File) => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onChoose(f);
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onChoose(f);
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => ref.current?.click()}
      className="flex h-24 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed"
      title="Drag & drop CSV here or click to choose"
    >
      <div className="text-center">
        {fileName ? (
          <div className="flex items-center gap-2">
            <Badge>{fileName}</Badge>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                ref.current?.click();
              }}
            >
              Change CSV
            </Button>
          </div>
        ) : (
          <>
            <div className="text-sm font-medium">Drop CSV here or click to choose</div>
            <div className="text-xs text-neutral-500">Accepted: .csv</div>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept={ACCEPT} onChange={onFileInput} className="hidden" />
    </div>
  );
}
