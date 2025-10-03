"use client";

import { Button } from "@/components/ui/button";

export default function FooterBar({
  onCancel,
  onSubmit,
  disabled,
  count,
  loading,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  disabled: boolean;
  count: number;
  loading: boolean;
}) {
  return (
    <div className="border-t px-5 py-3 flex items-center justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" disabled={disabled} onClick={onSubmit}>
        {loading ? "Importing…" : `Import ${count} row(s)`}
      </Button>
    </div>
  );
}
