// Línea divisoria usada para separar productos dentro de la plática de una nota.
// Se inserta automáticamente al presionar Enter dos veces seguidas (línea vacía + Enter).
// Se usa el carácter de dibujo de caja U+2500 porque se ve como una línea continua
// en cualquier fuente, sin necesidad de convertirlo a un <hr> al mostrarlo o imprimirlo.
export const NOTE_DIVIDER = '─'.repeat(42);

/**
 * Si el usuario presiona Enter estando en una línea vacía (es decir, la línea anterior
 * ya terminó en un salto de línea), reemplaza ese segundo Enter por una línea divisoria,
 * para separar visualmente cada producto de la plática con el cliente.
 * Devuelve null si no aplica (se debe dejar el comportamiento normal del textarea).
 */
export function applyDoubleEnterDivider(
  value: string,
  selectionStart: number,
  selectionEnd: number
): { value: string; cursor: number } | null {
  if (selectionStart !== selectionEnd) return null;

  const beforeCursor = value.slice(0, selectionStart);
  const lastLineBreak = beforeCursor.lastIndexOf('\n');
  if (lastLineBreak === -1) return null; // primera línea, nunca hay divisor todavía

  const currentLine = beforeCursor.slice(lastLineBreak + 1);
  if (currentLine !== '') return null; // la línea actual tiene contenido, es un Enter normal

  const beforePrevLine = beforeCursor.slice(0, lastLineBreak);
  if (beforePrevLine.endsWith(NOTE_DIVIDER)) return null; // ya hay un divisor justo arriba

  const insertion = `${NOTE_DIVIDER}\n`;
  return {
    value: beforeCursor + insertion + value.slice(selectionEnd),
    cursor: beforeCursor.length + insertion.length,
  };
}
