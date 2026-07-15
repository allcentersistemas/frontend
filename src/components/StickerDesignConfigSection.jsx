import { useMemo, useState } from 'react'
import { StickerLayoutEditor } from './StickerLayoutEditor.jsx'
import { loadGlobalStickerSettings } from '../utils/stickerGlobalSettings.js'
import { STICKER_LAYOUT_PREVIEW_SAMPLE } from '../utils/stickerVisualLayout.js'

/** Sección en Gestión → Configuración: diseño global de etiquetas Biesse. */
export function StickerDesignConfigSection() {
  const initialSettings = useMemo(() => loadGlobalStickerSettings(), [])
  const [editorKey, setEditorKey] = useState(0)

  return (
    <div className="card pad form-section" style={{ marginBottom: '1rem' }}>
      <h2>Etiquetas Biesse (stickers)</h2>
      <p className="muted small form-hint" style={{ marginBottom: '1rem' }}>
        Diseño global para todas las impresiones de stickers en este equipo: tamaño de rollo, dpi, tipografía
        y posición de campos. Los cambios aplican de inmediato a Órdenes Biesse y cualquier otra impresión de
        etiquetas.
      </p>
      <StickerLayoutEditor
        key={editorKey}
        embedded
        open
        initialSettings={initialSettings}
        previewData={STICKER_LAYOUT_PREVIEW_SAMPLE}
        onSaved={() => setEditorKey((k) => k + 1)}
        onClose={() => {}}
      />
    </div>
  )
}
