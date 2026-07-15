/** Nombre de ventana para reutilizar la misma pestaña popup. */
export const STICKER_EDITOR_WINDOW_NAME = 'allcenter-sticker-editor'

/** @typedef {'saved' | 'closed'} StickerEditorWindowEvent */

/**
 * Abre el editor de stickers en una ventana del navegador.
 * @returns {Window | null}
 */
export function openStickerEditorWindow() {
  if (typeof window === 'undefined') return null
  const url = `${window.location.origin}/sticker-editor`
  const features = [
    'popup=yes',
    'width=1320',
    'height=920',
    'left=80',
    'top=40',
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'resizable=yes',
    'scrollbars=yes',
  ].join(',')
  return window.open(url, STICKER_EDITOR_WINDOW_NAME, features)
}

/** @param {(event: StickerEditorWindowEvent) => void} listener */
export function onStickerEditorWindowEvent(listener) {
  if (typeof window === 'undefined') return () => {}
  function onMessage(event) {
    if (event.origin !== window.location.origin) return
    const type = event.data?.type
    if (type === 'sticker-design-saved') listener('saved')
    if (type === 'sticker-editor-closed') listener('closed')
  }
  window.addEventListener('message', onMessage)
  return () => window.removeEventListener('message', onMessage)
}

export function notifyStickerDesignSaved() {
  window.opener?.postMessage({ type: 'sticker-design-saved' }, window.location.origin)
}

export function notifyStickerEditorClosed() {
  window.opener?.postMessage({ type: 'sticker-editor-closed' }, window.location.origin)
}
