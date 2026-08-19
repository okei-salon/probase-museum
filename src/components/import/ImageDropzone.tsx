"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/cn";

type ImageDropzoneProps = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  hint?: string;
};

export function ImageDropzone({
  onFiles,
  disabled,
  maxFiles = 30,
  hint = "複数枚をまとめて選択できます。まずは月間MVP画面から取り込めます。",
}: ImageDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  const take = useCallback(
    (list: FileList | File[]) => {
      const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) return;
      onFiles(files.slice(0, maxFiles));
    },
    [maxFiles, onFiles],
  );

  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 transition-colors",
        dragging
          ? "border-[color:var(--museum-accent,#d4af37)] bg-[color:var(--museum-accent,#d4af37)]/10"
          : "border-white/20 bg-black/45 hover:border-white/35",
        disabled && "pointer-events-none opacity-50",
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        take(e.dataTransfer.files);
      }}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files) take(e.target.files);
          e.target.value = "";
        }}
      />
      <p className="text-[13px] tracking-[0.08em] text-[color:var(--museum-accent,#d4af37)]">
        画像を選択 / ドロップ
      </p>
      <p className="mt-2 max-w-md text-center text-[12px] leading-relaxed text-white/65">
        {hint}（最大{maxFiles}枚）
      </p>
    </label>
  );
}
