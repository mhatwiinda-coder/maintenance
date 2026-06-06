import { Badge } from '@/components/ui/badge'
import type { PriorityLevel } from '@/lib/database.types'

const priorityConfig: Record<PriorityLevel, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple'; label: string }> = {
  low:    { variant: 'secondary',   label: 'Low' },
  medium: { variant: 'info',        label: 'Medium' },
  high:   { variant: 'warning',     label: 'High' },
  urgent: { variant: 'destructive', label: 'Urgent' },
}

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  const config = priorityConfig[priority]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
