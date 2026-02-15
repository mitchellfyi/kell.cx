"use client";

import { useEffect, useState } from "react";

interface Section {
  id: string;
  label: string;
  emoji?: string;
  count?: number;
  highlight?: boolean; // Use colored highlight style
}

interface SectionNavProps {
  sections: Section[];
}

export function SectionNav({ sections }: SectionNavProps) {
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || "");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150; // Offset for sticky headers
      
      // Find the section that's currently in view
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const handleClick = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -120; // Account for sticky headers
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="sticky top-[57px] z-20 bg-zinc-950/95 backdrop-blur-sm -mx-6 px-6 py-2.5 mb-6 border-b border-white/[0.06]">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          const baseClasses = "px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all";
          
          let classes = baseClasses;
          if (isActive) {
            if (section.highlight) {
              // Colored highlight for primary sections
              classes += " bg-blue-500/20 text-blue-400 border border-blue-500/40";
            } else {
              classes += " bg-white/10 text-white border border-white/20";
            }
          } else {
            classes += " bg-white/[0.02] text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300 border border-white/[0.06]";
          }

          return (
            <button
              key={section.id}
              onClick={() => handleClick(section.id)}
              className={classes}
            >
              {section.emoji && <span className="mr-1">{section.emoji}</span>}
              {section.label}
              {section.count !== undefined && ` (${section.count})`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
