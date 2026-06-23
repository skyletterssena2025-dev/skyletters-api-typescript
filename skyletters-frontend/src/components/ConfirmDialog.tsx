import Modal from "./Modal";

interface Props {
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title = "Confirmar",
  message,
  confirmLabel = "Eliminar",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="confirm-msg">{message}</p>
      <div className="actions">
        <button type="button" className="secondary" title="Cancelar" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="danger-solid" title="Eliminar" onClick={onConfirm}>
          <i className="fa-solid fa-trash" /> {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
