import { CyberButton } from "./ui/cyber-button"

export function AboutSection() {
  return (
    <section id="about" className="w-full min-h-screen py-24 flex items-center justify-center relative border-t-4 border-border bg-background grid-pattern">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="border-4 border-secondary bg-background/90 p-8 md:p-12 shadow-[8px_8px_0px_var(--secondary)] relative group">
          <div className="absolute top-0 right-0 w-16 h-16 border-b-4 border-l-4 border-secondary transition-all group-hover:w-20 group-hover:h-20" />
          
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 flex flex-col gap-4">
              <h2 className="font-mono text-4xl font-bold text-secondary text-glow-jade tracking-widest uppercase mb-4 border-b-2 border-secondary/30 pb-2">
                SYS.ABOUT
              </h2>
              <div className="bg-muted p-4 border-l-4 border-secondary">
                <div className="flex justify-between items-center mb-2 font-mono text-xs">
                  <span className="text-muted-foreground">STATUS</span>
                  <span className="text-secondary animate-pulse text-glow-jade">ONLINE</span>
                </div>
                <div className="flex justify-between items-center mb-2 font-mono text-xs">
                  <span className="text-muted-foreground">ROLE</span>
                  <span className="text-foreground">DEV // DESIGN</span>
                </div>
                <div className="flex justify-between items-center mb-2 font-mono text-xs">
                  <span className="text-muted-foreground">LOCATION</span>
                  <span className="text-foreground">SECTOR_7</span>
                </div>
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-muted-foreground">XP</span>
                  <span className="text-foreground">LVL.MAX</span>
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-2/3">
              <p className="font-sans text-lg text-foreground leading-relaxed mb-6">
                Executing highly specialized directives in the field of <span className="text-primary font-bold">Front-End Engineering</span> and <span className="text-secondary font-bold">Reactive UI</span>. 
                My primary objective is constructing resilient, user-centric systems that withstand the chaos of the wild. 
              </p>
              <p className="font-sans text-lg text-muted-foreground leading-relaxed mb-8">
                Every line of code deployed is a strategic strike—calculated, efficient, and aesthetically dominant. I merge analytical problem-solving with raw creative vision to forge experiences that matter.
              </p>
              
              <div className="flex gap-4 font-mono">
                <CyberButton variant="secondary">INITIATE_DOWNLOAD // RESUME</CyberButton>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-2 right-4 text-[10px] font-mono text-secondary/50 uppercase">
            // DATA_BLOCK_TERMINATED
          </div>
        </div>
      </div>
    </section>
  )
}
