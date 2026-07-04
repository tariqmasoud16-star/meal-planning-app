"use client";

// Photo with graceful fallback: when photo_path is null — or the file is
// missing / fails to load — render a colored placeholder carrying the cuisine
// name. Never a broken-image icon.

import { useState } from "react";

const CUISINE_COLORS: Record<string, string> = {
  "Middle Eastern": "bg-amber-200 text-amber-900",
  Italian: "bg-rose-200 text-rose-900",
  Indian: "bg-orange-200 text-orange-900",
  Asian: "bg-emerald-200 text-emerald-900",
};

export default function RecipePhoto({
  photoPath,
  cuisine,
  title,
  className = "",
}: {
  photoPath: string | null;
  cuisine: string;
  title: string;
  className?: string;
}) {
  // Track the URL that failed, not a bare flag, so a later photo replacement
  // (new photoPath) is retried instead of staying on the placeholder.
  const [failedPath, setFailedPath] = useState<string | null>(null);

  if (photoPath && photoPath !== failedPath) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={photoPath}
        alt={title}
        onError={() => setFailedPath(photoPath)}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center ${
        CUISINE_COLORS[cuisine] ?? "bg-stone-200 text-stone-600"
      } ${className}`}
    >
      <span className="px-1 text-center text-xs font-semibold opacity-80">{cuisine}</span>
    </div>
  );
}
