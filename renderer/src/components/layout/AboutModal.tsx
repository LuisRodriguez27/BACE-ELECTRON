import React from 'react'
import { X, Info, Sparkles } from 'lucide-react'
import pkg from '../../../../package.json'

interface AboutModalProps {
  onClose: () => void
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  const latestVersion = pkg.version;
  const notes = localStorage.getItem('bace_release_notes')

  return (
    <div
      className="fixed inset-0 z-999999 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-4 rounded-2xl bg-gray-900 shadow-2xl border border-gray-700 w-full max-w-lg m-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4 bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20">
              <Info className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Acerca de BACE</h2>
              <p className="text-sm text-gray-400">Versión {latestVersion}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 pb-8 flex flex-col gap-6">
          {notes ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-green-400">
                <Sparkles size={16} />
                <h3 className="text-sm font-medium">Novedades de la versión {latestVersion}</h3>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {notes}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center text-gray-400">
              <p className="text-sm">No hay notas de lanzamiento disponibles para esta versión.</p>
              <p className="text-xs mt-2 text-gray-500">
                Las notas aparecerán aquí automáticamente tras actualizar la aplicación.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AboutModal
