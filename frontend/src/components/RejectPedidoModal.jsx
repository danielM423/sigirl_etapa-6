import { AlertTriangle, XCircle } from 'lucide-react';

const RejectPedidoModal = ({ open, pedido, motivo, onChangeMotivo, onClose, onConfirm }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-[#E0E0E0] rounded-xl overflow-hidden shadow-2xl animate-[fadeInScale_0.18s_ease]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E0E0E0] bg-rose-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-rose-600 uppercase tracking-wider">Rechazar pedido</h2>
              <p className="text-[10px] font-mono text-rose-400 mt-0.5">Registra un motivo claro para mantener trazabilidad del proceso.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-100 rounded-lg transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="rounded-lg border border-[#E0E0E0] bg-stone-50 p-4 space-y-1">
            <p className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-wider">Pedido seleccionado</p>
            <p className="text-sm font-mono font-bold text-stone-700">{pedido?.codigo || 'Sin código'}</p>
            <p className="text-[11px] font-mono text-stone-600">{pedido?.producto || 'Producto no disponible'}</p>
            <p className="text-[11px] font-mono text-stone-400">Solicitante: {pedido?.solicitante || 'Sin dato'}</p>
          </div>

          <div>
            <label className="block text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1.5">Motivo del rechazo</label>
            <textarea
              rows={4}
              value={motivo}
              onChange={(e) => onChangeMotivo(e.target.value)}
              className="w-full bg-white border border-[#E0E0E0] rounded-lg px-3 py-2.5 text-sm font-mono text-stone-700 placeholder-stone-300 focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200 transition-colors resize-none"
              placeholder="Explica por qué se rechaza el pedido y qué debe corregirse."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#E0E0E0] bg-stone-50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-mono font-bold border border-[#E0E0E0] text-stone-500 hover:text-stone-700 hover:border-stone-400 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-xs font-mono font-bold bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700 transition-colors shadow-sm flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Confirmar rechazo
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectPedidoModal;