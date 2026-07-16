import { useEffect, useMemo, useState } from 'react'
import { isZebraZplSize, resolveLabelDimensionsMm } from '../utils/stickerPrintSize.js'
import { loadGlobalStickerSettings } from '../utils/stickerGlobalSettings.js'
import { onStickerEditorWindowEvent, onStickerSettingsChanged, openStickerEditorWindow } from '../utils/openStickerEditorWindow.js'

/** Sección en Gestión → Configuración: diseño global de etiquetas Biesse. */
export function StickerDesignConfigSection() {
  const [saveMsg, setSaveMsg] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const summary = useMemo(() => {
    const global = loadGlobalStickerSettings()
    const dims = resolveLabelDimensionsMm(global.printSize, global.printOrientation, {
      widthMm: global.customWidthMm,
      heightMm: global.customHeightMm,
    })
    return { ...global, dims }
  }, [refreshKey, saveMsg])

  useEffect(() => {
    function refresh() {
      setRefreshKey((k) => k + 1)
    }
    const offEditor = onStickerEditorWindowEvent((event) => {
      if (event === 'saved') {
        setSaveMsg('Diseño guardado. Aplica a todas las impresiones de stickers en este equipo.')
      }
      refresh()
    })
    const offSettings = onStickerSettingsChanged(refresh)
    return () => {
      offEditor()
      offSettings()
    }
  }, [])

  function openEditor() {
    setSaveMsg('')
    const win = openStickerEditorWindow()
    if (!win) {
      window.alert(
        'No se pudo abrir la ventana del editor. Permita ventanas emergentes para este sitio e intente de nuevo.',
      )
    }
  }

  return (
    <div className="card pad form-section" style={{ marginBottom: '1rem' }}>
      <h2>Etiquetas Biesse (stickers)</h2>
      <p className="muted small form-hint" style={{ marginBottom: '0.75rem' }}>
        Diseño global para todas las impresiones: tamaño de rollo, dpi, tipografía y posición de campos. Se abre
        en una ventana aparte para ver el lienzo completo.
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
        Abrir diseño y tamaño en ventana…
      </button>
    </div>
  )
}
