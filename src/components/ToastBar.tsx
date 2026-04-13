import type { Toast } from "../types";

export function ToastBar({ toast }: { toast: Toast | null }) {
  if (!toast) {
    return null;
  }

  return (
    <div aria-atomic="true" aria-live="polite" className="toast-portal">
      <div className={`toast toast-${toast.type}`} role="status">
        {toast.message}
      </div>
    </div>
  );
}
