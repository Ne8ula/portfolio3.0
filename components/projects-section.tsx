export function ProjectsSection() {
  return (
    <section id="projects" className="w-full py-48 flex items-center justify-center relative border-t-4 border-border bg-[#111317]">
      <div className="container mx-auto px-6 max-w-4xl relative z-10">
        <div className="border-4 border-dashed border-primary/50 hover:border-primary p-12 md:p-24 flex flex-col items-center justify-center text-center bg-background/50 transition-colors group">
          <h2 className="font-mono text-2xl md:text-4xl font-black text-primary/70 group-hover:text-primary group-hover:text-glow-red tracking-widest uppercase mb-4 transition-all">
            [ PROJECTS_MODULE_PENDING ]
          </h2>
          <p className="font-mono text-sm md:text-base text-muted-foreground max-w-lg">
            AWAITING SPECIFIC DESIGN DIRECTIVES ALIGNED WITH THE MARATHON PROTOCOL. THIS SECTOR WILL REMAIN IN STANDBY MODE.
          </p>
          <div className="mt-12 flex gap-4">
             <div className="w-4 h-4 bg-primary/30 group-hover:bg-primary group-hover:shadow-[0_0_10px_var(--primary)] transition-all animate-pulse"></div>
             <div className="w-4 h-4 bg-primary/30 group-hover:bg-primary group-hover:shadow-[0_0_10px_var(--primary)] transition-all animate-pulse" style={{ animationDelay: '200ms' }}></div>
             <div className="w-4 h-4 bg-primary/30 group-hover:bg-primary group-hover:shadow-[0_0_10px_var(--primary)] transition-all animate-pulse" style={{ animationDelay: '400ms' }}></div>
          </div>
        </div>
      </div>
    </section>
  )
}
