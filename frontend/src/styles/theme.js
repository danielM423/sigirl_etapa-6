// Colores y temas alineados con glassmorphism de SIGIRL
export const colors = {
  primary: "#0f172a",
  secondary: "#1e293b",
  accent: "#10b981",
  accent2: "#14b8a6",
  accent3: "#06b6d4",
  admin: "#7c3aed",
  jefe: "#ef4444",
  danger: "#ef4444",
  warning: "#f59e0b",
  light: "#f8fafc",
  text: "#ffffff",
};

// Tema de la aplicación SIGIRL
export const theme = {
  // Tema Laboratorio (principal)
  laboratory: {
    colors: {
      primary: '#22c55e',
      primaryDark: '#16a34a',
      primaryGlow: 'rgba(34, 197, 94, 0.15)',
      background: '#0a0e12',
      surface: '#0d1217',
      surfaceLight: '#11161d',
      border: '#2a353d',
      text: '#e2e8f0',
      textDim: '#64748b',
      textAccent: '#86efac',
      danger: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    },
    fonts: {
      mono: "'JetBrains Mono', 'Fira Code', monospace",
      serif: "'Times New Roman', 'STIXGeneral', serif",
    },
  },
  
  // Tema Claro (alternativo)
  light: {
    colors: {
      primary: '#22c55e',
      primaryDark: '#16a34a',
      background: '#f8fafc',
      surface: '#ffffff',
      border: '#e2e8f0',
      text: '#0f172a',
      textDim: '#64748b',
      danger: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
    },
  },
};

export default theme;

// Estilos reutilizables
export const styles = {
  // Layout
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    padding: "20px",
  },

  row: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
  },

  // Cards
  card: {
    backgroundColor: colors.light,
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    color: "#1e293b",
  },

  cardAdmin: {
    backgroundColor: "#ffe5e5",
    borderLeft: `4px solid ${colors.danger}`,
  },

  cardSuccess: {
    backgroundColor: "#e6f9f0",
    borderLeft: `4px solid ${colors.accent2}`,
  },

  cardWarning: {
    backgroundColor: "#fff3cd",
    borderLeft: `4px solid ${colors.warning}`,
  },

  // Botones
  button: {
    padding: "10px 20px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s",
  },

  buttonPrimary: {
    backgroundColor: colors.accent,
    color: colors.text,
  },

  buttonDanger: {
    backgroundColor: colors.danger,
    color: colors.text,
  },

  buttonSuccess: {
    backgroundColor: colors.accent2,
    color: colors.text,
  },

  // Entrada
  input: {
    padding: "10px 12px",
    borderRadius: "6px",
    border: `2px solid ${colors.light}`,
    fontSize: "14px",
    transition: "border-color 0.3s",
  },

  // Tablas
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  },

  th: {
    backgroundColor: colors.primary,
    color: colors.text,
    padding: "12px",
    textAlign: "left",
    fontWeight: "600",
  },

  td: {
    padding: "10px 12px",
    borderBottom: `1px solid ${colors.light}`,
  },

  // Títulos
  h1: {
    fontSize: "28px",
    fontWeight: "700",
    color: colors.primary,
    marginBottom: "20px",
  },

  h2: {
    fontSize: "22px",
    fontWeight: "600",
    color: colors.primary,
    marginBottom: "15px",
  },

  h3: {
    fontSize: "18px",
    fontWeight: "600",
    color: colors.primary,
  },
};

// Función helper para combinar estilos
export const combineStyles = (...styleArr) => {
  return styleArr.reduce((acc, style) => ({ ...acc, ...style }), {});
};
