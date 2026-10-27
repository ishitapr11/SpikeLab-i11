/** Typesets a parameter symbol such as "Vrest" or "τm" as an italic letter with a subscript. */
export function ParameterSymbol({ symbol, className }: { symbol: string; className?: string }) {
  const [head, ...rest] = Array.from(symbol);
  const tail = rest.join("");
  return (
    <span className={className}>
      <i>{head}</i>
      {tail ? <sub className="ml-px align-[-0.32em] text-[0.55em] not-italic">{tail}</sub> : null}
    </span>
  );
}
