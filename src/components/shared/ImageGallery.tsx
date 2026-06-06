import { useEffect, useState } from 'react'
import { ImageIcon, ZoomIn, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { WorkOrderAttachment } from '@/lib/database.types'

interface ImageGalleryProps {
  workOrderId: string
}

export function ImageGallery({ workOrderId }: ImageGalleryProps) {
  const [attachments, setAttachments] = useState<WorkOrderAttachment[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      const { data } = await supabase
        .from('work_order_attachments')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: true })
      if (data) setAttachments(data as WorkOrderAttachment[])
      setLoading(false)
    }
    fetch()
  }, [workOrderId])

  if (loading) return null
  if (attachments.length === 0) return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
      <ImageIcon className="h-4 w-4" />
      <span>No images attached</span>
    </div>
  )

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {attachments.map(att => (
          <div
            key={att.id}
            className="relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer group"
            onClick={() => setLightbox(att.file_url)}
          >
            <img
              src={att.file_url}
              alt={att.file_name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
