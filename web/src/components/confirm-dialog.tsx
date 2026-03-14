import { Dialog } from '@ark-ui/react/dialog'
import { Portal } from '@ark-ui/react/portal'
import s from './confirm-dialog.module.css'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ open, title, onClose, onConfirm }: Props) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open: isOpen }) => !isOpen && onClose()}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Positioner
          style={{
            position: 'fixed',
            inset: 0,
            background: '#18140f88',
            backdropFilter: 'blur(2px)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Dialog.Content className={s.confirmBox}>
            <p className={s.confirmMsg}>
              Remove <strong>{title}</strong>? This cannot be undone.
            </p>
            <div className={s.confirmActions}>
              <Dialog.CloseTrigger className={s.btnSecondary}>Cancel</Dialog.CloseTrigger>
              <button className={s.btnDanger} onClick={onConfirm}>Remove</button>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
