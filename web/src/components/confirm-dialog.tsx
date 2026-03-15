import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ open, title, onClose, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-[300px] gap-4">
        <p className="text-[13px] text-foreground leading-relaxed">
          Remove <strong className="font-medium">{title}</strong>? This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
