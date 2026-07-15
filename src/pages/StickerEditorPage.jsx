import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StickerLayoutEditor } from '../components/StickerLayoutEditor.jsx'
import { loadGlobalStickerSettings } from '../utils/stickerGlobalSettings.js'
import { notifyStickerDesignSaved, notifyStickerEditorClosed } from '../utils/openStickerEditorWindow.js'
import { STICKER_LAYOUT_PREVIEW_SAMPLE } from '../utils/stickerVisualLayout.js'

/** Página dedicada para abrir el editor de stickers en ventana emergente del navegador. */
export function StickerEditorPage() {
  const navigate = useNavigate()
  const initialSettings = useMemo(() => loadGlobalStickerSettings(), [])
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    document.title = 'Diseño de etiquetas Biesse'
    return () => {
      notifyStickerEditorClosed()
    }
  }, [])

  function handleClose() {
    notifyStickerEditorClosed()
    if (window.opener) {
      window.close()
      return
    }
    navigate(-1)
  }

  function handleSaved() {
    setSaveMsg('Diseño guardado. Puede cerrar esta ventana o seguir ajustando.')
    notifyStickerDesignSaved()
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <div>
          <h1 className="m-0 text-lg font-semibold text-white">Diseño y tamaño de etiqueta Biesse</h1>
          <p className="m-0 mt-1 text-sm text-slate-400">
            Configuración global de stickers · tamaño de rollo, dpi, campos y tipografía
          </p>
        </div>
        <button type="button" className="btn btn--ghost" onClick={handleClose}>
          Cerrar ventana
        </button>
      </header>

      {saveMsg ? (
        <p className="shrink-0 border-b border-emerald-500/30 bg-emerald-950/40 px-5 py-2 text-sm text-emerald-200">
          {saveMsg}
        </p>
      ) : null}

      <main className="min-h-0 flex-1 overflow-hidden p-4">
        <StickerLayoutEditor
          embedded
          windowMode
          open
          initialSettings={initialSettings}
          previewData={STICKER_LAYOUT_PREVIEW_SAMPLE}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      </main>
    </div>
  )
}
