import Modal from "./Modal";
import { Button } from "./Field";

export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="p-4">
        <p className="text-slate-700 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium transition"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 font-semibold text-base bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
