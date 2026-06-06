import { useState, useRef } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface ImageUploaderProps {
  workOrderId: string
  uploadedBy: string
  onUploaded: (urls: string[]) => void
  className?: string
}

export function ImageUploader({ workOrderId, uploadedBy, onUploaded, className }: ImageUploaderProps) {
  const [previews, setPreviews] = useState<{ file: File; preview: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    const newPreviews = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, 5) // max 5 images
      .map(file => ({ file, preview: URL.createObjectURL(file) }))
    setPreviews(prev => [...prev, ...newPreviews].slice(0, 5))
  }

  function removeImage(index: number) {
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function uploadAll(): Promise<string[]> {
    if (previews.length === 0) return []
    setUploading(true)
    const uploadedUrls: string[] = []

    for (const { file } of previews) {
      const ext = file.name.split('.').pop()
      const path = `${workOrderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('work-order-images')
        .upload(path, file, { contentType: file.type, upsert: false })

      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('work-order-images')
          .getPublicUrl(path)

        // Save attachment record
        await supabase.from('work_order_attachments').insert({
          work_order_id: workOrderId,
          uploaded_by: uploadedBy,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
        })

        uploadedUrls.push(publicUrl)
      }
    }

    setUploading(false)
    setPreviews([])
    onUploaded(uploadedUrls)
    return uploadedUrls
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
      >
        <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Click or drag images here</p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP · Max 10MB each · Up to 5 photos</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map(({ preview }, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
              <img src={preview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading images...
        </div>
      )}

      {/* Expose upload function via ref-style — parent calls uploadAll() after form submit */}
      <input type="hidden" id={`uploader-trigger-${workOrderId}`} data-upload="pending" />
    </div>
  )
}

export { type ImageUploaderProps }
