import { useMemo, useState } from 'react'
import { StickerLayoutEditor } from './StickerLayoutEditor.jsx'
import { loadGlobalStickerSettings } from '../utils/stickerGlobalSettings.js'
import { STICKER_LAYOUT_PREVIEW_SAMPLE } from '../utils/stickerVisualLayout.js'
import { isZebraZplSize, resolveLabelDimensionsMm } from '../utils/stickerPrintSize.js'

/** Sección en Gestión → Configuración: diseño global de etiquetas Biesse. */
export function StickerDesignConfigSection() {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSettings, setEditorSettings] = useState(null)
  const [saveMsg, setSaveMsg] = useState('')

  const summary = useMemo(() => {
    const global = loadGlobalStickerSettings()
    const dims = resolveLabelDimensionsMm(global.printSize, global.printOrientation, {
      widthMm: global.customWidthMm,
      heightMm: global.customHeightMm,
    })
    return { ...global, dims }
  }, [editorOpen, saveMsg])

  function openEditor() {
    setEditorSettings(loadGlobalStickerSettings())
    setEditorOpen(true)
    setSaveMsg('')
  }

  function closeEditor() {
    setEditorOpen(false)
    setEditorSettings(null)
  }

  function handleSaved() {
    setSaveMsg('Diseño guardado. Aplica a todas las impresiones de stickers en este equipo.')
    closeEditor()
  }

  return (
    <div className="card pad form-section" style={{ marginBottom: '1rem' }}>
      <h2>Etiquetas Biesse (stickers)</h2>
      <p className="muted small form-hint" style={{ marginBottom: '0.75rem' }}>
        Diseño global para todas las impresiones: tamaño de rollo, dpi, tipografía y posición de campos.
      </p>

      <p className="small" style={{ marginBottom: '0.75rem' }}>
        Actual:{' '}
        <strong>
          {summary.dims.widthMm} × {summary.dims.heightMm} mm
        </strong>
        {' · '}
        {summary.printOrientation === 'landscape' ? 'horizontal' : 'vertical'}
        {' · '}
        {summary.printDpi} dpi
        {summary.useVisualLayout ? (
          <span className="text-amber-700 dark:text-amber-200"> · diseño visual activo</span>
        ) : (
          <span> · layout automático</span>
        )}
        {isZebraZplSize(summary.printSize) ? null : (
          <span className="muted"> · impresión HTML</span>
        )}
      </p>

      {saveMsg ? <p className="form-success" style={{ marginBottom: '0.75rem' }}>{saveMsg}</p> : null}

      <button type="button" className="btn btn--primary" onClick={openEditor}>
        Abrir diseño y tamaño…
      </button>

      {editorOpen && editorSettings ? (
        <StickerLayoutEditor
          open
          initialSettings={editorSettings}
          previewData={STICKER_LAYOUT_PREVIEW_SAMPLE}
          onClose={closeEditor}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  )
}
