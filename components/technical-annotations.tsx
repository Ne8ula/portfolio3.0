export function TechnicalAnnotations() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Top left coordinates */}
      <div className="absolute top-4 left-4 font-mono text-[10px] text-muted-foreground">
        <div>{"{"}</div>
        <div className="ml-2">[COORDINATES]</div>
        <div className="ml-2">X: 0.000</div>
        <div className="ml-2">Y: 0.000</div>
        <div>{"}"}</div>
      </div>

      {/* Top right program info */}
      <div className="absolute top-4 right-4 font-mono text-[10px] text-muted-foreground text-right hidden md:block">
        <div>PROGRAM ────┐</div>
        <div className="mt-1">NO.∞</div>
      </div>

      {/* Vertical text on right */}
      <div
        className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground hidden lg:block"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        ALEX_PORTFOLIO // V.2025
      </div>

      {/* Bottom left */}
      <div className="absolute bottom-4 left-4 font-mono text-[10px] text-muted-foreground hidden md:block">
        <div>[SYSTEM_STATUS]</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="w-1.5 h-1.5 bg-primary rounded-full" />
          <span>OPERATIONAL</span>
        </div>
      </div>

      {/* Grid reference markers */}
      <div className="absolute top-1/4 left-8 w-3 h-3 border border-primary opacity-40" />
      <div className="absolute top-1/3 right-1/4 w-2 h-2 border border-muted-foreground opacity-30" />
      <div className="absolute bottom-1/3 left-1/3 w-2 h-2 border border-muted-foreground opacity-30" />
    </div>
  )
}
