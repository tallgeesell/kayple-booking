export default function Modal({ title, children, onClose, busy = false }) {
  return (
    <div className="modal-bg" onClick={() => !busy && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <p className="modal-title">{title}</p>
        {children}
      </div>
    </div>
  )
}
