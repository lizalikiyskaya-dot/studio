"use client";

import { useState } from "react";
import { restoreSubscription } from "./actions";

export default function RestoreButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn-y mt-6"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void restoreSubscription(token);
      }}
    >
      Вернуть
    </button>
  );
}
