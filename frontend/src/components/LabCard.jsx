import React from 'react';

/**
 * Componente de tarjeta estilo laboratorio
 * @param {string} title - Título de la tarjeta
 * @param {string} badge - Texto del badge superior derecho
 * @param {string} badgeBottom - Texto del badge inferior izquierdo
 * @param {React.ReactNode} children - Contenido interno
 * @param {string} className - Clases CSS adicionales
 * @param {function} onClick - Manejador de clic
 */
const LabCard = ({ 
  title, 
  badge, 
  badgeBottom, 
  children, 
  className = '', 
  onClick,
  noHover = false
}) => {
  return (
    <div 
      className={`lab-card p-5 ${noHover ? '' : 'hover:border-lab-accent hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]'} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {badge && <div className="lab-badge">{badge}</div>}
      {badgeBottom && <div className="lab-badge-bottom">{badgeBottom}</div>}
      
      {title && (
        <h3 className="text-sm font-semibold text-emerald-400 mb-4 font-mono uppercase tracking-wider">
          {title}
        </h3>
      )}
      
      {children}
    </div>
  );
};

export default LabCard;