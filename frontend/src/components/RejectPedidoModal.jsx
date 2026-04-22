import { AlertTriangle, XCircle } from 'lucide-react';

const inputCls = 'w-full bg-[#0a0e12] border border-[#2a353d] rounded-md px-3 py-2.5 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors';

const RejectPedidoModal = ({ open, pedido, motivo, onChangeMotivo, onClose, onConfirm }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0d1217] border border-[#2a353d] rounded-lg overflow-hidden shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a353d]">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-rose-500/10 border border-rose-500/30">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-rose-400 uppercase tracking-wider">RECHAZAR PEDIDO</h2>
              <p className="text-[10px] font-mono text-slate-500 mt-0.5">Registra un motivo claro para mantener trazabilidad del proceso.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors">
            <XCircle className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-lg border border-[#2a353d] bg-[#11161d] p-4 space-y-1">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Pedido seleccionado</p>
            <p className="text-sm font-mono font-bold text-slate-200">{pedido?.codigo || 'Sin código'}</p>
            <p className="text-[11px] font-mono text-slate-400">{pedido?.producto || 'Producto no disponible'}</p>
            <p className="text-[11px] font-mono text-slate-500">Solicitante: {pedido?.solicitante || 'Sin dato'}</p>
          </div>

          <div>
            <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">Motivo del rechazo</label>
            <textarea
              rows={4}
              value={motivo}
              onChange={(e) => onChangeMotivo(e.target.value)}
              className={`${inputCls} resize-none`}
              placeholder="Explica por qué se rechaza el pedido y qué debe corregirse."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#2a353d] bg-[#0a0e12]">
          <button onClick={onClose} className="px-4 py-2 rounded text-xs font-mono font-bold border border-[#2a353d] text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded text-xs font-mono font-bold bg-rose-500 text-white hover:bg-rose-400 transition-colors shadow-[0_0_10px_rgba(244,63,94,0.25)]">Confirmar rechazo</button>
        </div>
      </div>
    </div>
  );
};

export default RejectPedidoModal;