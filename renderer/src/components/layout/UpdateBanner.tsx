import React, { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const UpdateBanner: React.FC = () => {
  const [ready, setReady] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [version, setVersion] = useState('')
  const [installing, setInstalling] = useState(false)

  const isDev = import.meta.env.DEV

  // ── Escuchar el evento de descarga completada (solo prod) ─────────────────
  useEffect(() => {
    if (isDev || !window.api?.updater) return

    window.api.updater.onUpdateDownloaded((info) => {
      setVersion(info.version)
      setReady(true) // Mostrar botón flotante, NO el modal
    })

    return () => window.api.updater.removeAllListeners()
  }, [isDev])

  const handleInstall = async () => {
    setInstalling(true)
    if (isDev) {
      await new Promise((r) => setTimeout(r, 1500))
      setInstalling(false)
      setModalOpen(false)
      setReady(false)
      return
    }
    await window.api.updater.install()
  }

  return (
    <>
      {/* ── Trigger DEV ──────────────────────────────────────────────────── */}
      {isDev && !ready && (
        <button
          id="dev-updater-toggle"
          onClick={() => { setVersion('4.2.0'); setReady(true) }}
          className="fixed bottom-20 left-4 z-[99999] rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-400 transition hover:bg-gray-700 hover:text-white"
        >
          DEV: simular update
        </button>
      )}

      {/* ── Botón flotante (aparece cuando la actualización está lista) ───── */}
      {ready && (
        <button
          id="update-fab"
          onClick={() => setModalOpen(true)}
          title={`BACE ${version} disponible`}
          className="animate-breathe fixed bottom-6 right-6 z-[99999] flex items-center gap-2 rounded-full bg-gray-800 pl-3 pr-4 py-2.5 text-xs font-medium text-white shadow-xl border border-gray-700 hover:bg-gray-700 transition-colors"
        >
          {/* Punto verde con ping */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          Actualización disponible
        </button>
      )}

      {/* ── Modal (solo se abre al hacer clic en el botón) ───────────────── */}
      {ready && modalOpen && (
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60"
          onClick={() => setModalOpen(false)} // cerrar al clickear el overlay
        >
          <div
            className="flex flex-col items-center gap-6 rounded-2xl bg-gray-900 px-10 py-8 shadow-2xl border border-gray-700 w-96 text-center"
            onClick={(e) => e.stopPropagation()} // no propagar al overlay
          >
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold text-white">
                Actualización disponible
              </h2>
              <p className="text-sm text-gray-400">
                BACE {version} está lista para instalarse.
                <br />
                La aplicación se reiniciará automáticamente.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2">
              <button
                id="update-install-btn"
                onClick={handleInstall}
                disabled={installing}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={15} className={installing ? 'animate-spin' : ''} />
                {installing ? 'Reiniciando...' : 'Reiniciar e instalar'}
              </button>

              <button
                id="update-cancel-btn"
                onClick={() => setModalOpen(false)}
                disabled={installing}
                className="w-full rounded-lg py-2.5 text-sm font-medium text-gray-500 transition hover:bg-gray-800 hover:text-gray-300 disabled:cursor-not-allowed"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default UpdateBanner
