import type { Territory } from './index.ts';

/** Filas de un CSV con comillas dobles y comas dentro de los campos (RFC 4180). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f !== ''));
}

/** Los territorios de cartas/cartas.csv (filas de tipo «territorio»), en su orden. */
export function parseTerritories(csv: string): Territory[] {
  const [header, ...rows] = parseCsv(csv);
  if (!header) return [];
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`Falta la columna «${name}» en cartas.csv`);
    return i;
  };
  const [id, type, name, text] = [col('id'), col('tipo'), col('nombre'), col('texto')];
  return rows
    .filter((r) => r[type] === 'territorio')
    .map((r) => ({ id: r[id]!, name: r[name]!, guide: r[text]! }));
}
