"use client"

import { useState } from "react"

export function IsometricCube() {
  const [hoveredFace, setHoveredFace] = useState<string | null>(null)

  return (
    <div className="relative">
      <div className="relative w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] md:w-[420px] md:h-[420px] lg:w-[520px] lg:h-[520px] xl:w-[650px] xl:h-[620px]">
        <svg viewBox="0 0 700 600" className="w-full h-full overflow-visible">
          {/*==================DEFINITIONS==================*/}
          <defs>
            <filter id="grainy-texture*/"}
              {/* Generate Noise */}
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" result="noise" />
              <feColorMatrix type ="saturatate" values="0" in="noise" result="grayNoise" />
              <feComponentTransfer in="grayNoise" result="theNoise">
                  <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feblend in="thenoise" in2="sourceGraphic" mode="multiply" />
            </filter>
          </defs>
          {/*==================FILTERED GROUP==================*/}
          <g filter="url(#grainy-texture)">

            <g>
              <polygon points="300, 60 370, 100 300, 140 230, 100" fill="e8e5dc" stroke="1a1a1a" strokeWidth="2" />
              <polygon points="370, 100 440, 140 370, 180 300, 140" fill="e8e5dc" stroke="1a1a1a" strokeWidth="2" />
              <polygon points="440, 140 510, 180 440, 220 370, 180" fill="e8e5dc" stroke="1a1a1a" strokeWidth="2" />

              <polygon points="230,100 300,140 230,180 160,140" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
              {/* Center tile - base for button */}
              <polygon points="300,140 370,180 300,220 230,180" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="370,180 440,220 370,260 300,220" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
              {/* Row 3 */}
              <polygon points="160,140 230,180 160,220 90,180" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="230,180 300,220 230,260 160,220" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="300,220 370,260 300,300 230,260" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
            </g>

            {/* LEFT FACE - 3x3 grid */}
            <g>
              {/* Column 1 (leftmost) */}
              <polygon points="90,180 160,220 160,300 90,260" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="90,260 160,300 160,380 90,340" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="90,340 160,380 160,460 90,420" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
              {/* Column 2 (middle) */}
              <polygon points="160,220 230,260 230,340 160,300" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
              {/* Center tile - base for button */}
              <polygon points="160,300 230,340 230,420 160,380" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="160,380 230,420 230,500 160,460" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
              {/* Column 3 (rightmost) */}
              <polygon points="230,260 300,300 300,380 230,340" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="230,340 300,380 300,460 230,420" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="230,420 300,460 300,540 230,500" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
            </g>

            {/* RIGHT FACE - 3x3 grid */}
            <g>
              {/* Column 1 (leftmost) */}
              <polygon points="300,300 370,260 370,340 300,380" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="300,380 370,340 370,420 300,460" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="300,460 370,420 370,500 300,540" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
              {/* Column 2 (middle) */}
              <polygon points="370,260 440,220 440,300 370,340" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
              {/* Center tile - base for button */}
              <polygon points="370,340 440,300 440,380 370,420" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="370,420 440,380 440,460 370,500" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
              {/* Column 3 (rightmost) */}
              <polygon points="440,220 510,180 510,260 440,300" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="440,300 510,260 510,340 440,380" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
              <polygon points="440,380 510,340 510,420 440,460" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
            </g>
          {/* ==================== CUBE BASE STRUCTURE ==================== */}

          {/* TOP FACE - 3x3 grid */}
          <g>
            {/* Row 1 */}
            <polygon points="300,60 370,100 300,140 230,100" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="370,100 440,140 370,180 300,140" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="440,140 510,180 440,220 370,180" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
            {/* Row 2 */}
            <polygon points="230,100 300,140 230,180 160,140" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
            {/* Center tile - base for button */}
            <polygon points="300,140 370,180 300,220 230,180" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="370,180 440,220 370,260 300,220" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
            {/* Row 3 */}
            <polygon points="160,140 230,180 160,220 90,180" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="230,180 300,220 230,260 160,220" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="300,220 370,260 300,300 230,260" fill="#e8e5dc" stroke="#1a1a1a" strokeWidth="2" />
          </g>

          {/* LEFT FACE - 3x3 grid */}
          <g>
            {/* Column 1 (leftmost) */}
            <polygon points="90,180 160,220 160,300 90,260" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="90,260 160,300 160,380 90,340" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="90,340 160,380 160,460 90,420" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
            {/* Column 2 (middle) */}
            <polygon points="160,220 230,260 230,340 160,300" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
            {/* Center tile - base for button */}
            <polygon points="160,300 230,340 230,420 160,380" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="160,380 230,420 230,500 160,460" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
            {/* Column 3 (rightmost) */}
            <polygon points="230,260 300,300 300,380 230,340" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="230,340 300,380 300,460 230,420" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="230,420 300,460 300,540 230,500" fill="#d9d5c8" stroke="#1a1a1a" strokeWidth="2" />
          </g>

          {/* RIGHT FACE - 3x3 grid */}
          <g>
            {/* Column 1 (leftmost) */}
            <polygon points="300,300 370,260 370,340 300,380" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="300,380 370,340 370,420 300,460" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="300,460 370,420 370,500 300,540" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
            {/* Column 2 (middle) */}
            <polygon points="370,260 440,220 440,300 370,340" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
            {/* Center tile - base for button */}
            <polygon points="370,340 440,300 440,380 370,420" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="370,420 440,380 440,460 370,500" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
            {/* Column 3 (rightmost) */}
            <polygon points="440,220 510,180 510,260 440,300" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="440,300 510,260 510,340 440,380" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
            <polygon points="440,380 510,340 510,420 440,460" fill="#ccc8bf" stroke="#1a1a1a" strokeWidth="2" />
          </g>

          {/* ==================== PROJECTS BUTTON - TOP CENTER ==================== */}
          <g
            onMouseEnter={() => setHoveredFace("projects")}
            onMouseLeave={() => setHoveredFace(null)}
            className="cursor-pointer"
            style={{
              transform: hoveredFace === "projects" ? "translateY(-15px)" : "translateY(0)",
              transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Button extrusion - left side */}
            <polygon points="230,160 300,200 300,220 230,180" fill="#a8a49c" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Button extrusion - right side */}
            <polygon points="370,160 300,200 300,220 370,180" fill="#8a867e" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Button top surface - isometric diamond */}
            <polygon
              points="300,120 370,160 300,200 230,160"
              fill={hoveredFace === "projects" ? "#d4a853" : "#f4f1e8"}
              stroke="#1a1a1a"
              strokeWidth="2"
            />
            {/* Vinyl icon - centered on top face */}
            <ellipse cx="300" cy="160" rx="45" ry="26" fill="#1a1a1a" />
            <ellipse cx="300" cy="160" rx="35" ry="20" fill="none" stroke="#5a5a52" strokeWidth="2" />
            <ellipse cx="300" cy="160" rx="22" ry="13" fill="none" stroke="#5a5a52" strokeWidth="1.5" />
            <ellipse cx="300" cy="160" rx="8" ry="5" fill="#d4a853" />
          </g>

          {/* ==================== ABOUT ME BUTTON - LEFT CENTER ==================== */}
          <g
            onMouseEnter={() => setHoveredFace("about")}
            onMouseLeave={() => setHoveredFace(null)}
            className="cursor-pointer"
            style={{
              transform: hoveredFace === "about" ? "translate(-15px, -8px)" : "translate(0, 0)",
              transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Button extrusion - top edge */}
            <polygon points="160,300 230,340 210,350 140,310" fill="#a8a49c" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Button extrusion - right side */}
            <polygon points="230,340 230,420 210,430 210,350" fill="#8a867e" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Button front face - isometric parallelogram matching left face tile */}
            <polygon
              points="140,310 210,350 210,430 140,390"
              fill={hoveredFace === "about" ? "#d4a853" : "#e8e5dc"}
              stroke="#1a1a1a"
              strokeWidth="2"
            />
            {/* Profile icon - properly skewed to match left face perspective */}
            <g transform="translate(175, 370)">
              {/* Head - skewed ellipse */}
              <ellipse cx="0" cy="-18" rx="12" ry="14" fill="#1a1a1a" transform="skewY(25)" />
              {/* Body/shoulders - skewed trapezoid */}
              <path
                d="M-18,0 L-14,-8 C-14,-12 14,-12 14,-8 L18,0 L18,22 L-18,22 Z"
                fill="#1a1a1a"
                transform="skewY(25)"
              />
            </g>
          </g>

          {/* ==================== CONTACT BUTTON - RIGHT CENTER ==================== */}
          <g
            onMouseEnter={() => setHoveredFace("contact")}
            onMouseLeave={() => setHoveredFace(null)}
            className="cursor-pointer"
            style={{
              transform: hoveredFace === "contact" ? "translate(15px, -8px)" : "translate(0, 0)",
              transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Button extrusion - top edge */}
            <polygon points="370,340 440,300 460,310 390,350" fill="#a8a49c" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Button extrusion - left edge */}
            <polygon points="370,340 370,420 390,430 390,350" fill="#8a867e" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Button front face - isometric parallelogram matching right face tile */}
            <polygon
              points="390,350 460,310 460,390 390,430"
              fill={hoveredFace === "contact" ? "#d4a853" : "#dddad1"}
              stroke="#1a1a1a"
              strokeWidth="2"
            />
            {/* Envelope icon - skewed to match right face perspective */}
            <g transform="translate(425, 370)">
              {/* Envelope body - skewed rectangle */}
              <path
                d="M-22,-18 L22,-18 L22,18 L-22,18 Z"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="2.5"
                transform="skewY(-25)"
              />
              {/* Envelope flap - skewed V */}
              <path d="M-22,-18 L0,0 L22,-18" fill="none" stroke="#1a1a1a" strokeWidth="2" transform="skewY(-25)" />
            </g>
          </g>

          {/* ==================== FIG ANNOTATIONS ==================== */}
          {/* FIG_01: ABOUT_ME - text below line */}
          <g className="pointer-events-none">
            <line x1="-30" y1="380" x2="140" y2="380" stroke="#5a5a52" strokeWidth="1.5" />
            <circle cx="140" cy="380" r="4" fill="#5a5a52" />
            <text
              x="-30"
              y="400"
              fill="#1a1a1a"
              fontSize="14"
              fontFamily="var(--font-vcr), monospace"
              fontWeight="bold"
            >
              FIG_01:
            </text>
            <text
              x="-30"
              y="418"
              fill="#1a1a1a"
              fontSize="14"
              fontFamily="var(--font-vcr), monospace"
              fontWeight="bold"
            >
              ABOUT_ME
            </text>
          </g>

          {/* FIG_02: PROJECTS - text below line */}
          <g className="pointer-events-none">
            <line x1="355" y1="100" x2="520" y2="100" stroke="#5a5a52" strokeWidth="1.5" />
            <circle cx="355" cy="100" r="4" fill="#5a5a52" />
            <text
              x="530"
              y="100"
              fill="#1a1a1a"
              fontSize="14"
              fontFamily="var(--font-vcr), monospace"
              fontWeight="bold"
            >
              FIG_02:
            </text>
            <text
              x="530"
              y="118"
              fill="#1a1a1a"
              fontSize="14"
              fontFamily="var(--font-vcr), monospace"
              fontWeight="bold"
            >
              PROJECTS
            </text>
          </g>

          {/* FIG_03: CONTACT - text below line */}
          <g className="pointer-events-none">
            <line x1="455" y1="370" x2="580" y2="370" stroke="#5a5a52" strokeWidth="1.5" />
            <circle cx="455" cy="370" r="4" fill="#5a5a52" />
            <text
              x="590"
              y="370"
              fill="#1a1a1a"
              fontSize="14"
              fontFamily="var(--font-vcr), monospace"
              fontWeight="bold"
            >
              FIG_03:
            </text>
            <text
              x="590"
              y="388"
              fill="#1a1a1a"
              fontSize="14"
              fontFamily="var(--font-vcr), monospace"
              fontWeight="bold"
            >
              CONTACT
            </text>
          </g>
        </svg>

        {/* Tooltip on hover */}
        {hoveredFace && (
          <div
            className="absolute bg-[#f4f1e8] border-2 border-[#1a1a1a] px-4 py-2 font-mono text-sm shadow-[4px_4px_0px_#1a1a1a] z-10 pointer-events-none whitespace-nowrap"
            style={{
              top: hoveredFace === "projects" ? "0%" : hoveredFace === "about" ? "55%" : "45%",
              left: hoveredFace === "about" ? "0%" : hoveredFace === "contact" ? "auto" : "45%",
              right: hoveredFace === "contact" ? "0%" : "auto",
            }}
          >
            <div className="font-bold text-sm tracking-wide">
              {hoveredFace === "projects" && "PROJECTS"}
              {hoveredFace === "about" && "ABOUT ME"}
              {hoveredFace === "contact" && "CONTACT"}
            </div>
            <div className="text-[#5a5a52] text-xs mt-1">
              {hoveredFace === "projects" && "BROWSE WORK"}
              {hoveredFace === "about" && "VIEW PROFILE"}
              {hoveredFace === "contact" && "GET IN TOUCH"}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
