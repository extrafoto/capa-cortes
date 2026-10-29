export const cropPresets = [
  { id: 'capa-principal', name: 'Capa principal', width: 2620, height: 1200, confirmed: true },
  { id: 'capa-secundaria', name: 'Capa secundária', width: 1800, height: 1200, provisional: true },
  { id: 'chamada-horizontal', name: 'Chamada horizontal', width: 1200, height: 800, provisional: true },
  { id: 'janela-vertical', name: 'Janela vertical', width: 800, height: 1200, provisional: true },
  { id: 'chamada-panoramica', name: 'Chamada panorâmica', width: 2000, height: 700, provisional: true }
].map((preset) => ({ ...preset, ratio: preset.width / preset.height }));
