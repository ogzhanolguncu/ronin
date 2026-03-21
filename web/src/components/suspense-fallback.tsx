import { Loader2 } from "lucide-react"

export function SuspenseFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )
}
