type ToastProps = {
  type: "success" | "error";
  message: string;
  onDismiss?: () => void;
};

export function Toast({ type, message, onDismiss }: ToastProps) {
  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm ${
        type === "success"
          ? "border-success/20 bg-success-soft text-success"
          : "border-danger/20 bg-danger-soft text-danger"
      }`}
    >
      <p>{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs opacity-70 hover:opacity-100"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
