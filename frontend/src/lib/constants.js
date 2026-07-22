export const UBICACIONES = [
  "Stock", "Exposición", "Stock Exposición", "Entrega", "Taller",
  "Terraza", "Entreplanta", "Reservado",
];

export const ESTADOS = [
  "Disponible", "Reservado", "Vendido", "En preparación", "Entregado",
];

export const CATEGORIAS = [
  "SUV", "Berlina", "Touring", "Coupé", "Gran Coupé", "Compact",
  "Familiar", "Cabrio", "Roadster", "Eléctrico",
];

export const ESTADO_COLORS = {
  Disponible: { bg: "#E8F5EC", text: "#1B8A4B", dot: "#1B8A4B" },
  Reservado: { bg: "#FFF4E5", text: "#B26A00", dot: "#E7A100" },
  Vendido: { bg: "#EAF3FB", text: "#003DA5", dot: "#003DA5" },
  "En preparación": { bg: "#EEF0F3", text: "#2B2B2B", dot: "#5BC2E7" },
  Entregado: { bg: "#FDEBEC", text: "#E7222E", dot: "#E7222E" },
};

// Catálogo oficial de colores BMW (aproximación de acabado real)
export const BMW_COLORS = [
  { name: "Alpine White", code: "300", hex: "#F4F4F4" },
  { name: "Mineral White", code: "A96", hex: "#E7E4DF" },
  { name: "Black Sapphire", code: "475", hex: "#1B1D20" },
  { name: "Carbon Black", code: "416", hex: "#26292E" },
  { name: "Brooklyn Grey", code: "C4A", hex: "#6E7378" },
  { name: "Skyscraper Grey", code: "C57", hex: "#9BA0A6" },
  { name: "Sophisto Grey", code: "A90", hex: "#4B4E52" },
  { name: "Dravit Grey", code: "C4E", hex: "#5A5C5E" },
  { name: "Frozen Pure Grey", code: "P0C", hex: "#8C9094" },
  { name: "Tanzanite Blue", code: "X1B", hex: "#1E2A44" },
  { name: "Portimao Blue", code: "C31", hex: "#2E5FA3" },
  { name: "Frozen Portimao Blue", code: "P39", hex: "#2C568F" },
  { name: "Phytonic Blue", code: "C1M", hex: "#274C6B" },
  { name: "Cape York Green", code: "C4W", hex: "#2F4638" },
  { name: "San Remo Green", code: "C57", hex: "#3B5A4A" },
  { name: "Fire Red", code: "A75", hex: "#C0122A" },
  { name: "Aventurin Red", code: "X13", hex: "#5A0E1E" },
  { name: "Melbourne Red", code: "A75", hex: "#7A1220" },
  { name: "Sunset Orange", code: "C1F", hex: "#B5461E" },
  { name: "Individual", code: "IND", hex: "#8A8D91" },
];

export const NAV_MAIN = [
  { key: "inicio", label: "Inicio", path: "/", icon: "LayoutDashboard" },
  { key: "stock", label: "Stock", path: "/stock", icon: "Car" },
  { key: "plano", label: "Plano", path: "/plano", icon: "Map" },
  { key: "entregas", label: "Entregas", path: "/entregas", icon: "PackageCheck" },
];

export const ZONAS_PLANO = [
  { name: "Exposición", color: "#0066B1" },
  { name: "Stock Exposición", color: "#5BC2E7" },
  { name: "Taller", color: "#2B2B2B" },
  { name: "Terraza", color: "#1B8A4B" },
  { name: "Entreplanta", color: "#B26A00" },
  { name: "Entregas", color: "#E7222E" },
];

export const zoneColor = (zona) =>
  ZONAS_PLANO.find((z) => z.name === zona)?.color || "#0066B1";

export const NAV_SECONDARY = [
  { key: "mobiliario", label: "Mobiliario", path: "/mobiliario", icon: "Armchair" },
  { key: "estadisticas", label: "Estadísticas", path: "/estadisticas", icon: "BarChart3" },
  { key: "configuracion", label: "Configuración", path: "/configuracion", icon: "Settings" },
];
