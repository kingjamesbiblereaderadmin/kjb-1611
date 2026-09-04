// Font options for Bible exports (PDF / Word / RTF).
//
// PDF (jsPDF) ships three standard families — times (serif), helvetica (sans)
// and courier (mono). For the decorative options (cursive, dyslexic, legible)
// we EMBED a real TrueType font at export time (see embedPdfFont in
// lib/embedPdfFont.js) so the PDF actually shows the chosen face. Word (.doc
// HTML) and RTF reference fonts by NAME, so the reader's system font is used.
//
// `embed` (when present) tells the PDF embedder which TTF files to download
// from a CDN and register with jsPDF. `pdf` is the fallback built-in used if
// embedding fails or for the standard families.
export const EXPORT_FONTS = [
  {
    id: 'serif',
    label: 'Serif',
    pdf: 'times',               // jsPDF built-in
    css: "'Times New Roman', Georgia, serif",
    rtf: 'Times New Roman',
  },
  {
    id: 'sans',
    label: 'Sans-serif',
    pdf: 'helvetica',
    css: "Arial, Helvetica, sans-serif",
    rtf: 'Arial',
  },
  {
    id: 'mono',
    label: 'Monospace',
    pdf: 'courier',
    css: "'Courier New', monospace",
    rtf: 'Courier New',
  },
  {
    id: 'cursive',
    label: 'Cursive',
    pdf: 'times',
    css: "'Segoe Script', 'Brush Script MT', 'Comic Sans MS', cursive",
    rtf: 'Segoe Script',
    embed: {
      family: 'DancingScript',
      // Dancing Script — a flowing cursive (same family used in the in-app reader)
      normal: 'https://cdn.jsdelivr.net/fontsource/fonts/dancing-script@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/dancing-script@latest/latin-700-normal.ttf',
    },
  },
  {
    id: 'legible',
    label: 'High-legibility',
    pdf: 'helvetica',
    css: "'Atkinson Hyperlegible', 'Verdana', 'Tahoma', sans-serif",
    rtf: 'Atkinson Hyperlegible',
    embed: {
      family: 'AtkinsonHyperlegible',
      normal: 'https://cdn.jsdelivr.net/fontsource/fonts/atkinson-hyperlegible@latest/latin-400-normal.ttf',
      bold: 'https://cdn.jsdelivr.net/fontsource/fonts/atkinson-hyperlegible@latest/latin-700-normal.ttf',
      italic: 'https://cdn.jsdelivr.net/fontsource/fonts/atkinson-hyperlegible@latest/latin-400-italic.ttf',
    },
  },
];

export const DEFAULT_EXPORT_FONT = 'serif';

export function getExportFont(id) {
  return EXPORT_FONTS.find(f => f.id === id) || EXPORT_FONTS[0];
}