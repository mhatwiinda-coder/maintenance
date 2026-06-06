import { Badge } from '@/components/ui/badge'
import type { WorkOrderStatus } from '@/lib/database.types'
import { capitalize } from '@/lib/utils'

const statusConfig: Record<WorkOrderStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple'; label: string }> = {
  pending:     { variant: 'warning',     label: 'Pending' },
  accepted:    { variant: 'info',        label: 'Accepted' },
  assigned:    { variant: 'purple',      label: 'Assigned' },
  in_progress: { variant: 'default',     label: 'In Progress' },
  completed:   { variant: 'success',     label: 'Completed' },
  cancelled:   { variant: 'destructive', label: 'Cancelled' },
}

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const config = statusConfig[status] ?? { variant: 'outline' as const, label: capitalize(status) }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
