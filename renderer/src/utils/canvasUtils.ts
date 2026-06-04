/**
 * Converts any browser-supported CSS color string (e.g. oklch, oklab, etc.)
 * to standard rgba format using a canvas context.
 */
export const convertColorToRgba = (colorStr: string): string => {
  if (!colorStr) return 'transparent';
  if (!colorStr.includes('oklch') && !colorStr.includes('oklab')) {
    return colorStr;
  }
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return colorStr;
    ctx.fillStyle = colorStr;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
  } catch (e) {
    return 'transparent';
  }
};

/**
 * html2canvas onclone callback to sanitize oklch and oklab colors
 * by converting them to rgba, preventing html2canvas from crashing.
 */
export const sanitizeOklchOnClone = (clonedDoc: Document) => {
  const elements = clonedDoc.getElementsByTagName('*');
  const view = clonedDoc.defaultView || window;
  
  const colorProps = [
    'backgroundColor',
    'color',
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'fill',
    'stroke'
  ];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement;
    if (el.style) {
      try {
        const computed = view.getComputedStyle(el);
        for (const prop of colorProps) {
          const val = computed[prop as keyof CSSStyleDeclaration] as string;
          if (val && (val.includes('oklch') || val.includes('oklab'))) {
            (el.style as any)[prop] = convertColorToRgba(val);
          }
        }
      } catch (err) {
        // Ignore errors
      }
    }
  }
};
