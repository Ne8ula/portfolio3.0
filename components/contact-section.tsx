export function ContactSection() {
  return (
    <section id="contact" className="w-full py-24 flex items-center justify-center relative border-t-4 border-border bg-background grid-pattern">
      <div className="container mx-auto px-6 max-w-4xl relative z-10">
        <div className="border-4 border-accent bg-background/95 p-8 md:p-12 shadow-[8px_8px_0px_var(--accent)] relative">
          {/* Accent corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-b-4 border-r-4 border-accent"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-t-4 border-l-4 border-accent"></div>
          
          <h2 className="font-mono text-4xl font-bold text-accent tracking-widest uppercase mb-2">
             TRANSMISSION_PROTOCOL
          </h2>
          <p className="font-mono text-muted-foreground text-sm mb-8">
            ESTABLISH A SECURE LINE. EXPECT A RESPONSE WITHIN 0.4 STANDARD CYCLES.
          </p>
          
          <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-xs text-accent font-bold">/// ALIAS_IDENTIFIER</label>
                <input 
                  type="text" 
                  className="bg-card border-none border-b-4 border-border hover:border-accent focus:border-accent focus:outline-none focus:bg-accent/5 transition-all p-3 font-mono text-foreground"
                  placeholder="Subject Name"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-mono text-xs text-accent font-bold">/// NETWORK_ROUTING_ADDRESS</label>
                <input 
                  type="email" 
                  className="bg-card border-none border-b-4 border-border hover:border-accent focus:border-accent focus:outline-none focus:bg-accent/5 transition-all p-3 font-mono text-foreground"
                  placeholder="comm@link.sys"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              <label className="font-mono text-xs text-accent font-bold">/// DATA_PAYLOAD</label>
              <textarea 
                rows={5}
                className="bg-card border-none border-l-4 border-border hover:border-accent focus:border-accent focus:outline-none focus:bg-accent/5 transition-all p-4 font-mono text-foreground resize-none"
                placeholder="Enter raw signal data..."
              ></textarea>
            </div>
            
            <div className="flex justify-end mt-4">
               <button className="bg-accent text-accent-foreground font-mono font-bold px-8 py-3 border-2 border-accent hover:bg-transparent hover:text-accent shadow-[4px_4px_0px_#111317] hover:shadow-[4px_4px_0px_var(--accent)] transition-all tracking-widest cursor-crosshair">
                 BROADCAST_SIGNAL
               </button>
            </div>
          </form>
          
          <div className="absolute bottom-2 left-4 text-[10px] font-mono text-accent/50 uppercase">
             ENCRYPTION_LVL: MAXIMUM
          </div>
        </div>
      </div>
    </section>
  )
}
