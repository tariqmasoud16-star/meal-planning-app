"use client";

// Opens the browser's native print dialog — that dialog IS the preview.
// No PDF libraries, no routes, no server involvement.
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print rounded bg-stone-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-stone-700"
    >
      🖨 Print
    </button>
  );
}
