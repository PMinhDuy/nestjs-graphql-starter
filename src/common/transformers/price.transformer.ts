// PostgreSQL returns DECIMAL as string; transformer parses it back to number
export const priceTransformer = {
  to: (v: number) => v,
  from: (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; },
};
