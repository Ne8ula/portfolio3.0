export function Header() {
  return (
    <header className="w-full px-6 py-4 md:px-12 md:py-5 border-b-4 border-border bg-background/80 backdrop-blur-sm z-50">
      <div className="flex items-center justify-between font-mono text-sm uppercase tracking-wider">
        <div className="flex items-center gap-4">
          <span className="text-secondary font-bold hidden sm:inline text-glow-jade">{"{"}</span>
          <nav className="flex items-center gap-3 text-xs md:text-sm font-bold">
            <span className="text-primary">{">"}</span>
            <a href="#about" className="hover:text-secondary hover:text-glow-jade transition-colors">
              [ABOUT]
            </a>
            <span className="text-muted-foreground">::</span>
            <a href="#projects" className="hover:text-secondary hover:text-glow-jade transition-colors">
              [PROJECTS]
            </a>
            <span className="text-muted-foreground">::</span>
            <a href="#contact" className="hover:text-secondary hover:text-glow-jade transition-colors">
              [CONTACT]
            </a>
          </nav>
          <span className="text-secondary font-bold hidden sm:inline text-glow-jade">{"}"}</span>
        </div>

        <div className="flex items-center gap-3 text-xs md:text-sm border-2 border-primary px-3 py-1 bg-card shadow-[4px_4px_0px_var(--primary)]">
          <span className="text-muted-foreground font-bold tracking-widest">STATUS:</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
            <span className="font-bold text-foreground font-mono px-1">ONLINE</span>
          </div>
        </div>
      </div>
    </header>
  )
}
