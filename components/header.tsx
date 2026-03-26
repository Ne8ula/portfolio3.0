export function Header() {
  return (
    <header className="w-full px-6 py-4 md:px-12 md:py-5 border-b border-[#1a1a1a] bg-[#f4f1e8]/80 backdrop-blur-sm">
      <div className="flex items-center justify-between font-mono text-sm uppercase tracking-wider">
        <div className="flex items-center gap-4">
          <span className="text-[#1a1a1a] font-bold hidden sm:inline">{"{"}</span>
          <nav className="flex items-center gap-3 text-xs md:text-sm">
            <span className="text-muted-foreground">{">"}</span>
            <a href="#about" className="hover:text-[#d4a853] transition-colors">
              [ABOUT]
            </a>
            <span className="text-muted-foreground">::</span>
            <a href="#projects" className="hover:text-[#d4a853] transition-colors">
              [PROJECTS]
            </a>
            <span className="text-muted-foreground">::</span>
            <a href="#contact" className="hover:text-[#d4a853] transition-colors">
              [CONTACT]
            </a>
          </nav>
          <span className="text-[#1a1a1a] font-bold hidden sm:inline">{"}"}</span>
        </div>

        <div className="flex items-center gap-3 text-xs md:text-sm border border-[#1a1a1a] px-3 py-1 rounded-sm bg-[#f4f1e8]">
          <span className="text-[#5a5a52]">STATUS:</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#3a5a40] rounded-full animate-pulse" />
            <span className="font-bold text-[#1a1a1a]">ONLINE</span>
          </div>
        </div>
      </div>
    </header>
  )
}
