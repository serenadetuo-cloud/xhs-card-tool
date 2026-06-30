import React, { useId } from "react";
import { Template, CardSettings, Page } from "../types";

interface CardPreviewProps {
  page: Page;
  pageIndex: number;
  totalPages: number;
  template: Template;
  settings: CardSettings;
  aspectRatio: "3:4" | "3:5";
  containerId?: string; // used for downloading/exporting
}

export const CardPreview: React.FC<CardPreviewProps> = ({
  page,
  pageIndex,
  totalPages,
  template,
  settings,
  aspectRatio,
  containerId,
}) => {
  const compId = useId();

  // Upgraded rich markdown inline parser that handles nested styles cleanly:
  // - Highlight: ==text==
  // - Bold: **text**
  // - Strikethrough: ~~text~~
  // - Italic: *text*
  // - Underline: ++text++
  // - Inline code: `text`
  const renderMarkdownInline = (text: string): React.ReactNode => {
    interface Rule {
      regex: RegExp;
      render: (content: React.ReactNode, key: string) => React.ReactNode;
    }

    const hlColorClass =
      template.highlightColors[settings.highlightColor as keyof typeof template.highlightColors] ||
      template.highlightColors.yellow;

    const rules: Rule[] = [
      {
        regex: /==([\s\S]*?)==/,
        render: (content, key) => (
          <span key={key} className={`${hlColorClass} inline font-medium px-1 py-0.5 rounded-sm transition-all`}>
            {content}
          </span>
        ),
      },
      {
        regex: /\*\*([\s\S]*?)\*\*/,
        render: (content, key) => <strong key={key} className="font-bold inline" style={{ color: settings.customTitleColor || settings.customTextColor || undefined }}>{content}</strong>,
      },
      {
        regex: /~~([\s\S]*?)~~/,
        render: (content, key) => <del key={key} className="line-through opacity-70 inline">{content}</del>,
      },
      {
        regex: /\*([\s\S]*?)\*/,
        render: (content, key) => <em key={key} className="italic inline">{content}</em>,
      },
      {
        regex: /\+\+([\s\S]*?)\+\+/,
        render: (content, key) => <span key={key} className="underline decoration-current/40 inline">{content}</span>,
      },
      {
        regex: /`([\s\S]*?)`/,
        render: (content, key) => (
          <code key={key} className="font-mono bg-black/5 dark:bg-white/15 px-1 py-0.5 rounded text-[0.88em] border border-black/5 dark:border-white/5 font-semibold inline mx-0.5">
            {content}
          </code>
        ),
      },
    ];

    // Recursive parsing through styling hierarchy
    const parse = (input: string, ruleIdx: number): React.ReactNode => {
      if (ruleIdx >= rules.length) {
        return input;
      }

      const rule = rules[ruleIdx];
      const match = rule.regex.exec(input);

      if (!match) {
        return parse(input, ruleIdx + 1);
      }

      const before = input.substring(0, match.index);
      const matchedText = match[1];
      const after = input.substring(match.index + match[0].length);
      const uniqueKey = `md-${ruleIdx}-${match.index}`;

      return (
        <>
          {before ? parse(before, ruleIdx) : null}
          {rule.render(parse(matchedText, ruleIdx + 1), uniqueKey)}
          {after ? parse(after, ruleIdx) : null}
        </>
      );
    };

    return parse(text, 0);
  };

  // Helper sizes mapping
  const getFontSizeClass = (size: 'sm' | 'md' | 'lg' | 'xl') => {
    switch (size) {
      case 'sm': return "15px";
      case 'md': return "17px";
      case 'lg': return "19px";
      case 'xl': return "22px";
    }
  };

  const getHeaderSize = (bodySize: 'sm' | 'md' | 'lg' | 'xl', multiplier: number) => {
    const base = parseFloat(getFontSizeClass(bodySize));
    return `${base * multiplier}px`;
  };

  const getTitleSizeClass = (size: 'sm' | 'md' | 'lg' | 'xl' | '2xl') => {
    switch (size) {
      case 'sm': return "20px";
      case 'md': return "24px";
      case 'lg': return "28px";
      case 'xl': return "32px";
      case '2xl': return "38px";
    }
  };

  const getCoverTitleSize = (size: 'sm' | 'md' | 'lg' | 'xl' | '2xl') => {
    switch (size) {
      case 'sm': return "25px";
      case 'md': return "30px";
      case 'lg': return "36px";
      case 'xl': return "42px";
      case '2xl': return "48px";
    }
  };

  const getCoverSubtitleSize = (bodySize: 'sm' | 'md' | 'lg' | 'xl') => {
    switch (bodySize) {
      case 'sm': return "15px";
      case 'md': return "17px";
      case 'lg': return "19px";
      case 'xl': return "21px";
    }
  };

  // Convert raw page content to elements
  const parseContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Empty line
      if (!trimmed) {
        return <div key={`empty-${idx}`} className="h-4" id={`p-empty-${idx}`} />;
      }

      // H1 Header (# )
      if (trimmed.startsWith("# ")) {
        return (
          <h1
            key={`h1-${idx}`}
            id={`p-h1-${idx}`}
            className="font-sans font-bold tracking-tight mb-4 mt-2"
            style={{
              fontSize: getHeaderSize(settings.bodySize, 1.45),
              textAlign: settings.alignment as any,
              lineHeight: settings.lineHeight,
              letterSpacing: `${settings.letterSpacing}px`,
              color: settings.customAccentColor || undefined,
            }}
          >
            {renderMarkdownInline(trimmed.substring(2))}
          </h1>
        );
      }

      // H2 Header (## )
      if (trimmed.startsWith("## ")) {
        return (
          <h2
            key={`h2-${idx}`}
            id={`p-h2-${idx}`}
            className="font-sans font-semibold tracking-tight mt-4 mb-2 opacity-95"
            style={{
              fontSize: getHeaderSize(settings.bodySize, 1.22),
              textAlign: settings.alignment as any,
              lineHeight: settings.lineHeight,
              letterSpacing: `${settings.letterSpacing}px`,
              color: settings.customAccentColor || undefined,
            }}
          >
            {renderMarkdownInline(trimmed.substring(3))}
          </h2>
        );
      }

      // H3 Header (### )
      if (trimmed.startsWith("### ")) {
        return (
          <h3
            key={`h3-${idx}`}
            id={`p-h3-${idx}`}
            className="font-sans font-medium tracking-tight mt-3 mb-1 opacity-90"
            style={{
              fontSize: getHeaderSize(settings.bodySize, 1.1),
              textAlign: settings.alignment as any,
              lineHeight: settings.lineHeight,
              letterSpacing: `${settings.letterSpacing}px`,
              color: settings.customTextColor || undefined,
            }}
          >
            {renderMarkdownInline(trimmed.substring(4))}
          </h3>
        );
      }

      // Blockquotes (> )
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote
            key={`quote-${idx}`}
            id={`p-quote-${idx}`}
            className="border-l-4 border-current/30 pl-4 py-2 my-4 italic opacity-90 bg-current/[0.04] rounded-r-md"
            style={{
              fontSize: getFontSizeClass(settings.bodySize),
              textAlign: settings.alignment as any,
              lineHeight: settings.lineHeight,
              letterSpacing: `${settings.letterSpacing}px`,
              color: settings.customTextColor || undefined,
            }}
          >
            {renderMarkdownInline(trimmed.substring(2))}
          </blockquote>
        );
      }

      // Bullet List item (- or * or •)
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
        const bulletText = trimmed.substring(2);
        return (
          <div
            key={`bullet-${idx}`}
            id={`p-bullet-${idx}`}
            className="flex items-start mb-2.5"
            style={{
              fontSize: getFontSizeClass(settings.bodySize),
              textAlign: settings.alignment as any,
              lineHeight: settings.lineHeight,
              letterSpacing: `${settings.letterSpacing}px`,
              color: settings.customTextColor || undefined,
            }}
          >
            <span className="mr-2 select-none text-rose-500/80">•</span>
            <div className="flex-1">{renderMarkdownInline(bulletText)}</div>
          </div>
        );
      }

      // Standard Paragraph line
      return (
        <p
          key={`p-${idx}`}
          id={`p-para-${idx}`}
          className="mb-3 last:mb-0 whitespace-pre-wrap"
          style={{
            fontSize: getFontSizeClass(settings.bodySize),
            textAlign: settings.alignment as any,
            lineHeight: settings.lineHeight,
            letterSpacing: `${settings.letterSpacing}px`,
            color: settings.customTextColor || undefined,
          }}
        >
          {renderMarkdownInline(trimmed)}
        </p>
      );
    });
  };

  // Border Radius Mapping
  const getRadiusClass = (radius: string) => {
    switch (radius) {
      case 'none': return "rounded-none";
      case 'sm': return "rounded-sm";
      case 'md': return "rounded-md";
      case 'lg': return "rounded-lg";
      case 'xl': return "rounded-xl";
      case '2xl': return "rounded-2xl";
      case '3xl': return "rounded-3xl";
      default: return "rounded-xl";
    }
  };

  // Shadow Mapping
  const getShadowClass = (shadow: string) => {
    switch (shadow) {
      case 'none': return "shadow-none";
      case 'sm': return "shadow-sm";
      case 'md': return "shadow-md";
      case 'lg': return "shadow-lg";
      case 'xl': return "shadow-xl";
      case '2xl': return "shadow-2xl";
      default: return "shadow-lg";
    }
  };

  // Font family helper
  const getFontFamilyStyle = (family: string) => {
    switch (family) {
      case 'sans': return 'var(--font-sans)';
      case 'display': return '"Space Grotesk", "Outfit", var(--font-sans)';
      case 'mono': return 'var(--font-mono)';
      case 'serif': return '"Playfair Display", Georgia, serif';
      default: return 'var(--font-sans)';
    }
  };

  const isDarkBackground = (bgColor: string) => {
    if (!bgColor.startsWith('#')) return false;
    const hex = bgColor.replace('#', '');
    if (hex.length < 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 120;
  };

  const isTemplateDark = settings.customBgColor
    ? isDarkBackground(settings.customBgColor)
    : (template.bgClass.includes('black') || template.bgClass.includes('950') || template.bgClass.includes('900') || template.bgClass.includes('0B0F19') || template.bgClass.includes('indigo-950') || template.bgClass.includes('slate-950') || template.id.includes('dark') || template.id.includes('black'));

  // Inline styling for background structures (e.g. Grids)
  const getBgStyle = () => {
    const isDark = isTemplateDark;
    const color = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';

    switch (settings.bgPattern) {
      case 'grid':
        return {
          backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        };
      case 'dots':
        return {
          backgroundImage: `radial-gradient(${color} 1.5px, transparent 1.5px)`,
          backgroundSize: '16px 16px',
        };
      case 'diagonal':
        return {
          backgroundImage: `linear-gradient(45deg, ${gridColor} 25%, transparent 25%, transparent 75%, ${gridColor} 75%, ${gridColor}), linear-gradient(45deg, ${gridColor} 25%, transparent 25%, transparent 75%, ${gridColor} 75%, ${gridColor})`,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px',
        };
      case 'waves':
        return {
          backgroundImage: `radial-gradient(circle at 100% 150%, transparent 24%, ${color} 24%, ${color} 28%, transparent 28%, transparent), radial-gradient(circle at 0% 150%, transparent 24%, ${color} 24%, ${color} 28%, transparent 28%, transparent)`,
          backgroundSize: '20px 20px',
        };
      case 'none':
      default:
        if (template.decorations === 'grid') {
          return {
            backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          };
        }
        return {};
    }
  };

  // Subtle repeating background watermark for anti-counterfeiting
  const renderBgWatermark = () => {
    if (!settings.showBgWatermark || !settings.showWatermark || !settings.watermark) return null;
    const watermarkText = settings.watermark;
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-[0.03] dark:opacity-[0.05]" style={{ mixBlendMode: 'multiply' }}>
        <div className="absolute w-[200%] h-[200%] -left-1/2 -top-1/2 transform -rotate-12 flex flex-col justify-around py-4">
          {Array.from({ length: 14 }).map((_, rIdx) => (
            <div key={rIdx} className="flex justify-around whitespace-nowrap text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: settings.customTextColor || 'currentColor' }}>
              {Array.from({ length: 6 }).map((_, cIdx) => (
                <span key={cIdx} className="mx-6">{watermarkText}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render decorative visual components matching each aesthetic theme
  const renderDecorations = (styleName: string | undefined) => {
    switch (styleName) {
      case 'grid':
        return (
          <>
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20 pointer-events-none" />
            <div className="absolute top-6 right-6 flex space-x-1.5 opacity-40 pointer-events-none">
              <span className="text-emerald-500 text-xs">✦</span>
              <span className="text-emerald-500 text-xs">✧</span>
            </div>
            <div className="absolute left-3 top-0 bottom-0 flex flex-col justify-around py-8 pointer-events-none opacity-30">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full border border-emerald-500 bg-white" />
              ))}
            </div>
          </>
        );
      case 'retro':
        return (
          <>
            <div className="absolute -top-1 right-8 w-6 h-12 border-2 border-neutral-400 bg-neutral-300 rounded-b-xl z-10 shadow-sm opacity-90 transform -rotate-6 flex items-end justify-center pb-2 pointer-events-none">
              <div className="w-2 h-8 border border-neutral-500 rounded-b-lg bg-neutral-200" />
            </div>
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#805A3B]/10 pointer-events-none" />
          </>
        );
      case 'morandi':
        return (
          <>
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-[#D4D9D4]/40 mix-blend-multiply pointer-events-none" />
            <div className="absolute bottom-24 -right-10 w-24 h-24 rounded-full bg-[#E8DDD9]/50 mix-blend-multiply pointer-events-none" />
            <div className="absolute top-1/3 right-4 w-6 h-6 border border-[#5E726B]/20 rotate-45 pointer-events-none" />
          </>
        );
      case 'forest':
        return (
          <>
            <div className="absolute inset-3 border border-[#F1C40F]/15 pointer-events-none" />
            <div className="absolute top-5 right-6 text-[#F1C40F]/45 text-sm pointer-events-none">✦</div>
          </>
        );
      case 'macaron':
        return (
          <>
            <div className="absolute top-8 right-8 text-pink-400/30 text-sm pointer-events-none">✦</div>
            <div className="absolute bottom-16 left-6 text-purple-400/20 text-xs pointer-events-none">✧</div>
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-pink-200/20 blur-xl pointer-events-none" />
          </>
        );
      case 'sunset':
        return (
          <>
            <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-yellow-300/15 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-[#FF5E62]/20 blur-3xl pointer-events-none" />
            <div className="absolute top-7 right-32 text-white/30 text-xs pointer-events-none">✦</div>
          </>
        );
      case 'zhihu':
        return (
          <>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-neutral-800 pointer-events-none" />
          </>
        );
      case 'deepspace':
        return (
          <>
            <div className="absolute inset-4 border border-indigo-500/10 rounded-lg pointer-events-none" />
            <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
            <div className="absolute top-6 right-6 text-indigo-400/30 text-xs pointer-events-none">✦</div>
          </>
        );
      case 'spring':
        return (
          <>
            <div className="absolute top-5 right-6 text-[#1B5E20]/25 text-xs pointer-events-none">✦</div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-emerald-200/20 blur-xl pointer-events-none" />
          </>
        );
      case 'red':
        return (
          <>
            <div className="absolute top-0 left-0 w-full h-2 bg-yellow-300 pointer-events-none" />
            <div className="absolute top-5 right-6 text-yellow-300/60 text-xs pointer-events-none">✦</div>
          </>
        );
      default:
        return null;
    }
  };

  // If it is a Cover page, render a magnificent custom-designed cover layout instead
  if (page.id === "cover") {
    const coverTitleSizePx = parseFloat(getCoverTitleSize(settings.titleSize)) * (settings.coverTitleSizeMultiplier || 1.0);
    const coverSubtitleSizePx = parseFloat(getCoverSubtitleSize(settings.bodySize)) * (settings.coverSubtitleSizeMultiplier || 1.0);
    const coverTagSizePx = 12 * (settings.coverTaglineSizeMultiplier || 1.0);

    const isDark = isTemplateDark;
    const accentLineBg = template.accentColor.includes('text-') 
      ? template.accentColor.replace('text-', 'bg-') 
      : 'bg-rose-500';

    // Helper to render tags list
    const renderTags = () => {
      const tagItems = settings.coverTags ? settings.coverTags.split(/[•·,，、\s/]+/).filter(Boolean) : ["封面推荐"];
      return (
        <div className={`flex flex-wrap gap-2 items-center ${['magazine', 'asymmetric'].includes(settings.coverLayout || 'classic') ? 'justify-start' : 'justify-center'}`}>
          {tagItems.map((tag, idx) => (
            <span
              key={idx}
              className="px-3.5 py-1 font-bold rounded-full bg-black/5 dark:bg-white/10 tracking-wider border border-black/5 dark:border-white/5 shadow-sm whitespace-nowrap inline-block"
              style={{
                color: settings.customTextColor || undefined,
                fontSize: `${coverTagSizePx}px`
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      );
    };

    // Helper to render author signature and watermark
    const renderSignature = (alignmentClass: string) => {
      return (
        <div className={`flex flex-col ${alignmentClass} space-y-2 mt-auto z-10`}>
          {settings.coverAuthor && (
            <div
              className="text-sm tracking-widest font-extrabold opacity-90 flex items-center gap-1 bg-black/5 dark:bg-white/10 px-3 py-1 rounded-md w-fit"
              style={{ color: settings.customTextColor || undefined }}
            >
              <span className="opacity-40 font-light">✍️</span>
              <span>{settings.coverAuthor}</span>
            </div>
          )}

          {settings.showWatermark && settings.watermark && (
            <div
              className="text-[11px] tracking-widest opacity-60 font-bold"
              style={{ color: settings.customTextColor || undefined }}
            >
              {settings.watermark}
            </div>
          )}
        </div>
      );
    };

    // 1. Minimal Book (Poetic / Literary Inset Border Layout)
    if (settings.coverLayout === 'minimal-book') {
      return (
        <div
          id={containerId}
          className={`relative w-full ${aspectRatio === "3:4" ? "aspect-[3/4]" : "aspect-[3/5]"} overflow-hidden select-none flex flex-col justify-between ${settings.customBgColor ? "" : template.bgClass} ${getRadiusClass(settings.borderRadius)} ${getShadowClass(settings.shadow)} transition-all duration-300`}
          style={{
            fontFamily: getFontFamilyStyle(settings.coverTitleFont && settings.coverTitleFont !== 'inherit' ? settings.coverTitleFont : settings.fontFamily),
            backgroundColor: settings.customBgColor || undefined,
            ...getBgStyle(),
          }}
        >
          {/* Visual decorations & Background Watermark */}
          {renderDecorations(template.decorations)}
          {renderBgWatermark()}

          {/* Inset elegant fine border */}
          <div className="absolute inset-5 border border-current/10 rounded pointer-events-none z-10" style={{ color: settings.customTextColor || undefined }} />

          <div
            className="flex-1 flex flex-col justify-between relative z-10"
            style={{
              paddingTop: `${settings.padding * 1.5}px`,
              paddingBottom: `${settings.padding * 1.3}px`,
              paddingLeft: `${settings.padding + 12}px`,
              paddingRight: `${settings.padding + 12}px`,
            }}
          >
            {/* Top tags centered */}
            <div className="flex justify-center text-center mt-2">
              {renderTags()}
            </div>

            {/* Center title & subtitle with elegant wide letter-spacing */}
            <div className="my-auto flex flex-col items-center text-center space-y-6">
              <span className="text-[10px] uppercase tracking-[0.3em] opacity-45 font-bold" style={{ color: settings.customTextColor || undefined }}>
                ESSENTIAL READING
              </span>
              
              <h1
                id="p-cover-main-title"
                className={`${settings.customTitleColor ? "" : template.titleColor} font-serif font-medium tracking-wide`}
                style={{
                  fontSize: `${coverTitleSizePx}px`,
                  fontFamily: getFontFamilyStyle(settings.coverTitleFont && settings.coverTitleFont !== 'inherit' ? settings.coverTitleFont : 'serif'),
                  textAlign: "center",
                  lineHeight: "1.35",
                  color: settings.customTitleColor || undefined,
                }}
              >
                {settings.coverTitle ? settings.coverTitle.split('\n').map((t, i) => (
                  <div key={i}>{t}</div>
                )) : "无标题封面"}
              </h1>

              {settings.coverSubtitle && (
                <p
                  id="p-cover-subtitle"
                  className="opacity-75 font-serif max-w-[85%] mx-auto tracking-widest text-xs leading-relaxed"
                  style={{
                    fontFamily: getFontFamilyStyle(settings.coverSubtitleFont && settings.coverSubtitleFont !== 'inherit' ? settings.coverSubtitleFont : 'sans'),
                    fontSize: `${coverSubtitleSizePx}px`,
                    textAlign: "center",
                    color: settings.customTextColor || undefined,
                  }}
                >
                  {settings.coverSubtitle.split('\n').map((t, i) => (
                    <div key={i} className="mt-1">{t}</div>
                  ))}
                </p>
              )}
            </div>

            {/* Centered signature */}
            {renderSignature("items-center text-center")}
          </div>
        </div>
      );
    }

    // 2. Asymmetric Poster (Modern offset layout)
    if (settings.coverLayout === 'asymmetric') {
      return (
        <div
          id={containerId}
          className={`relative w-full ${aspectRatio === "3:4" ? "aspect-[3/4]" : "aspect-[3/5]"} overflow-hidden select-none flex flex-col justify-between ${settings.customBgColor ? "" : template.bgClass} ${getRadiusClass(settings.borderRadius)} ${getShadowClass(settings.shadow)} transition-all duration-300`}
          style={{
            fontFamily: getFontFamilyStyle(settings.fontFamily),
            backgroundColor: settings.customBgColor || undefined,
            ...getBgStyle(),
          }}
        >
          {renderDecorations(template.decorations)}
          {renderBgWatermark()}

          <div
            className="flex-1 flex flex-col justify-between relative z-10"
            style={{
              paddingTop: `${settings.padding * 1.5}px`,
              paddingBottom: `${settings.padding * 1.2}px`,
              paddingLeft: `${settings.padding}px`,
              paddingRight: `${settings.padding}px`,
            }}
          >
            {/* Left aligned tags and huge accent number or sign */}
            <div className="flex justify-between items-start">
              <div>
                {renderTags()}
              </div>
              <span className="text-4xl font-mono opacity-20 font-black tracking-tighter" style={{ color: settings.customTitleColor || undefined }}>
                01
              </span>
            </div>

            {/* Asymmetrical main content - pushed to the upper-middle section */}
            <div className="my-auto flex flex-col items-start text-left space-y-4 pt-4">
              <span className="text-[10px] font-bold tracking-[0.25em] opacity-45 uppercase" style={{ color: settings.customTextColor || undefined }}>
                RECOMMENDED READS
              </span>
              <h1
                id="p-cover-main-title"
                className={`${settings.customTitleColor ? "" : template.titleColor} font-black tracking-tight`}
                style={{
                  fontSize: `${coverTitleSizePx * 1.05}px`,
                  fontFamily: getFontFamilyStyle(settings.coverTitleFont && settings.coverTitleFont !== 'inherit' ? settings.coverTitleFont : settings.fontFamily),
                  textAlign: "left",
                  lineHeight: "1.2",
                  color: settings.customTitleColor || undefined,
                }}
              >
                {settings.coverTitle ? settings.coverTitle.split('\n').map((t, i) => (
                  <div key={i}>{t}</div>
                )) : "无标题封面"}
              </h1>

              {settings.coverSubtitle && (
                <p
                  id="p-cover-subtitle"
                  className="opacity-85 font-medium leading-relaxed max-w-[95%] border-l-2 pl-3 border-current/20"
                  style={{
                    fontFamily: getFontFamilyStyle(settings.coverSubtitleFont && settings.coverSubtitleFont !== 'inherit' ? settings.coverSubtitleFont : settings.fontFamily),
                    fontSize: `${coverSubtitleSizePx}px`,
                    textAlign: "left",
                    color: settings.customTextColor || undefined,
                  }}
                >
                  {settings.coverSubtitle.split('\n').map((t, i) => (
                    <div key={i} className="mt-1">{t}</div>
                  ))}
                </p>
              )}
            </div>

            {/* Asymmetrical left aligned signature */}
            {renderSignature("items-start text-left")}
          </div>
        </div>
      );
    }

    // 3. Bold Impact (High contrast container card)
    if (settings.coverLayout === 'bold-impact') {
      return (
        <div
          id={containerId}
          className={`relative w-full ${aspectRatio === "3:4" ? "aspect-[3/4]" : "aspect-[3/5]"} overflow-hidden select-none flex flex-col justify-between ${settings.customBgColor ? "" : template.bgClass} ${getRadiusClass(settings.borderRadius)} ${getShadowClass(settings.shadow)} transition-all duration-300`}
          style={{
            fontFamily: getFontFamilyStyle(settings.fontFamily),
            backgroundColor: settings.customBgColor || undefined,
            ...getBgStyle(),
          }}
        >
          {renderDecorations(template.decorations)}
          {renderBgWatermark()}

          <div
            className="flex-1 flex flex-col justify-between relative z-10"
            style={{
              paddingTop: `${settings.padding * 1.4}px`,
              paddingBottom: `${settings.padding * 1.1}px`,
              paddingLeft: `${settings.padding}px`,
              paddingRight: `${settings.padding}px`,
            }}
          >
            {/* Top tags with centered layout */}
            <div className="flex justify-center mt-1">
              {renderTags()}
            </div>

            {/* Center title inside a massive, stylish contrast container */}
            <div className="my-auto flex flex-col items-center text-center space-y-5">
              <div className="bg-black/5 dark:bg-white/10 px-5 py-4 rounded-2xl border border-black/[0.03] dark:border-white/[0.05] shadow-inner w-full">
                <h1
                  id="p-cover-main-title"
                  className={`${settings.customTitleColor ? "" : template.titleColor} leading-tight font-black tracking-tight`}
                  style={{
                    fontSize: `${coverTitleSizePx * 1.1}px`,
                    fontFamily: getFontFamilyStyle(settings.coverTitleFont && settings.coverTitleFont !== 'inherit' ? settings.coverTitleFont : settings.fontFamily),
                    textAlign: "center",
                    lineHeight: "1.25",
                    letterSpacing: `${settings.letterSpacing}px`,
                    color: settings.customTitleColor || undefined,
                  }}
                >
                  {settings.coverTitle ? settings.coverTitle.split('\n').map((t, i) => (
                    <div key={i}>{t}</div>
                  )) : "无标题封面"}
                </h1>
              </div>

              {settings.coverSubtitle && (
                <p
                  id="p-cover-subtitle"
                  className="opacity-95 leading-relaxed font-bold tracking-wide max-w-[90%] mx-auto"
                  style={{
                    fontFamily: getFontFamilyStyle(settings.coverSubtitleFont && settings.coverSubtitleFont !== 'inherit' ? settings.coverSubtitleFont : settings.fontFamily),
                    fontSize: `${coverSubtitleSizePx * 1.05}px`,
                    textAlign: "center",
                    color: settings.customTextColor || undefined,
                  }}
                >
                  {settings.coverSubtitle.split('\n').map((t, i) => (
                    <div key={i} className="mt-1">{t}</div>
                  ))}
                </p>
              )}
            </div>

            {/* Bottom section centered signature */}
            {renderSignature("items-center text-center")}
          </div>
        </div>
      );
    }

    // 4. Split Layout
    if (settings.coverLayout === 'split') {
      return (
        <div
          id={containerId}
          className={`relative w-full ${aspectRatio === "3:4" ? "aspect-[3/4]" : "aspect-[3/5]"} overflow-hidden select-none flex flex-col justify-between ${settings.customBgColor ? "" : template.bgClass} ${getRadiusClass(settings.borderRadius)} ${getShadowClass(settings.shadow)} transition-all duration-300`}
          style={{
            fontFamily: getFontFamilyStyle(settings.fontFamily),
            backgroundColor: settings.customBgColor || undefined,
            ...getBgStyle(),
          }}
        >
          {/* Visual decorations & Background Watermark */}
          {renderDecorations(template.decorations)}
          {renderBgWatermark()}

          {/* Top colored contrast block (30%) */}
          <div className="bg-black/[0.04] dark:bg-white/[0.04] border-b border-black/[0.05] dark:border-white/[0.05] py-8 px-6 flex items-center justify-center shrink-0 z-10">
            {renderTags()}
          </div>

          {/* Bottom content block (70%) */}
          <div 
            className="flex-1 flex flex-col justify-between relative z-10"
            style={{
              paddingTop: `${settings.padding * 0.9}px`,
              paddingBottom: `${settings.padding * 1.1}px`,
              paddingLeft: `${settings.padding + (template.decorations === 'grid' ? 12 : 0)}px`,
              paddingRight: `${settings.padding}px`,
            }}
          >
            {/* Main content */}
            <div className="my-auto flex flex-col items-center text-center space-y-5">
              <div className="w-10 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full opacity-90" />
              <h1
                id="p-cover-main-title"
                className={`${settings.customTitleColor ? "" : template.titleColor} leading-tight font-black tracking-tight drop-shadow-sm`}
                style={{
                  fontSize: `${coverTitleSizePx}px`,
                  fontFamily: getFontFamilyStyle(settings.coverTitleFont && settings.coverTitleFont !== 'inherit' ? settings.coverTitleFont : settings.fontFamily),
                  textAlign: "center",
                  lineHeight: "1.25",
                  letterSpacing: `${settings.letterSpacing + 1.2}px`,
                  color: settings.customTitleColor || undefined,
                }}
              >
                {settings.coverTitle ? settings.coverTitle.split('\n').map((t, i) => (
                  <div key={i}>{t}</div>
                )) : "无标题封面"}
              </h1>

              {settings.coverSubtitle && (
                <p
                  id="p-cover-subtitle"
                  className="opacity-90 leading-relaxed font-semibold max-w-[92%] mx-auto"
                  style={{
                    fontFamily: getFontFamilyStyle(settings.coverSubtitleFont && settings.coverSubtitleFont !== 'inherit' ? settings.coverSubtitleFont : settings.fontFamily),
                    fontSize: `${coverSubtitleSizePx}px`,
                    textAlign: "center",
                    lineHeight: "1.5",
                    letterSpacing: `${settings.letterSpacing}px`,
                    color: settings.customTextColor || undefined,
                  }}
                >
                  {settings.coverSubtitle.split('\n').map((t, i) => (
                    <div key={i} className="mt-1">{t}</div>
                  ))}
                </p>
              )}
              <div className="w-16 h-[1.5px] bg-current opacity-20 my-2" style={{ color: settings.customTextColor || undefined }} />
            </div>

            {/* Signature centered */}
            {renderSignature("items-center text-center")}
          </div>
        </div>
      );
    }

    // 5. Magazine Layout
    if (settings.coverLayout === 'magazine') {
      return (
        <div
          id={containerId}
          className={`relative w-full ${aspectRatio === "3:4" ? "aspect-[3/4]" : "aspect-[3/5]"} overflow-hidden select-none flex flex-col justify-between ${settings.customBgColor ? "" : template.bgClass} ${getRadiusClass(settings.borderRadius)} ${getShadowClass(settings.shadow)} transition-all duration-300`}
          style={{
            fontFamily: getFontFamilyStyle(settings.fontFamily),
            backgroundColor: settings.customBgColor || undefined,
            ...getBgStyle(),
          }}
        >
          {/* Huge decorative background watermark text */}
          <div className="absolute right-6 top-20 text-[100px] font-black pointer-events-none select-none opacity-5 tracking-tighter z-0" style={{ color: settings.customTextColor || 'currentColor' }}>
            IDEA
          </div>

          {/* Visual decorations & Background Watermark */}
          {renderDecorations(template.decorations)}
          {renderBgWatermark()}

          <div
            className="flex-1 flex flex-col justify-between relative z-10"
            style={{
              paddingTop: `${settings.padding * 1.3}px`,
              paddingBottom: `${settings.padding * 1.1}px`,
              paddingLeft: `${settings.padding + (template.decorations === 'grid' ? 12 : 0) + 8}px`,
              paddingRight: `${settings.padding}px`,
            }}
          >
            {/* Top tags list left-aligned */}
            <div className="mb-4">
              {renderTags()}
            </div>

            {/* Main Title Block left-aligned with a beautiful accent bar */}
            <div className="my-auto flex flex-col items-start text-left space-y-6">
              <div className="flex items-stretch w-full">
                <div className={`w-1.5 self-stretch rounded-full shrink-0 mr-4 ${accentLineBg}`} style={{ backgroundColor: settings.customTitleColor || undefined }} />
                <h1
                  id="p-cover-main-title"
                  className={`${settings.customTitleColor ? "" : template.titleColor} leading-tight font-black tracking-tight`}
                  style={{
                    fontSize: `${coverTitleSizePx}px`,
                    fontFamily: getFontFamilyStyle(settings.coverTitleFont && settings.coverTitleFont !== 'inherit' ? settings.coverTitleFont : settings.fontFamily),
                    textAlign: "left",
                    lineHeight: "1.25",
                    letterSpacing: `${settings.letterSpacing}px`,
                    color: settings.customTitleColor || undefined,
                  }}
                >
                  {settings.coverTitle ? settings.coverTitle.split('\n').map((t, i) => (
                    <div key={i}>{t}</div>
                  )) : "无标题封面"}
                </h1>
              </div>

              {settings.coverSubtitle && (
                <p
                  id="p-cover-subtitle"
                  className="opacity-90 leading-relaxed font-semibold max-w-[95%] pl-5"
                  style={{
                    fontFamily: getFontFamilyStyle(settings.coverSubtitleFont && settings.coverSubtitleFont !== 'inherit' ? settings.coverSubtitleFont : settings.fontFamily),
                    fontSize: `${coverSubtitleSizePx}px`,
                    textAlign: "left",
                    lineHeight: "1.5",
                    letterSpacing: `${settings.letterSpacing}px`,
                    color: settings.customTextColor || undefined,
                  }}
                >
                  {settings.coverSubtitle.split('\n').map((t, i) => (
                    <div key={i} className="mt-1">{t}</div>
                  ))}
                </p>
              )}
            </div>

            {/* Signature at bottom right */}
            {renderSignature("items-end text-right")}
          </div>
        </div>
      );
    }

    // 6. Classic Layout (Default)
    return (
      <div
        id={containerId}
        className={`relative w-full ${aspectRatio === "3:4" ? "aspect-[3/4]" : "aspect-[3/5]"} overflow-hidden select-none flex flex-col justify-between ${settings.customBgColor ? "" : template.bgClass} ${getRadiusClass(settings.borderRadius)} ${getShadowClass(settings.shadow)} transition-all duration-300`}
        style={{
          fontFamily: getFontFamilyStyle(settings.fontFamily),
          backgroundColor: settings.customBgColor || undefined,
          ...getBgStyle(),
        }}
      >
        {/* Visual decorations & Background Watermark */}
        {renderDecorations(template.decorations)}
        {renderBgWatermark()}

        <div
          className="flex-1 flex flex-col justify-between relative z-10"
          style={{
            paddingTop: `${settings.padding * 1.3}px`,
            paddingBottom: `${settings.padding * 1.1}px`,
            paddingLeft: `${settings.padding + (template.decorations === 'grid' ? 12 : 0)}px`,
            paddingRight: `${settings.padding}px`,
          }}
        >
          {/* Top section: Category Tag Badges */}
          <div className="flex flex-wrap gap-2 items-center justify-center mt-3">
            {renderTags()}
          </div>

          {/* Center section: Massive Title & Subtitle */}
          <div className="my-auto flex flex-col items-center text-center space-y-5">
            {/* Elegant visual line ornament */}
            <div className="w-10 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full opacity-90" />

            <h1
              id="p-cover-main-title"
              className={`${settings.customTitleColor ? "" : template.titleColor} leading-tight font-black tracking-tight drop-shadow-sm`}
              style={{
                fontSize: `${coverTitleSizePx}px`,
                fontFamily: getFontFamilyStyle(settings.coverTitleFont && settings.coverTitleFont !== 'inherit' ? settings.coverTitleFont : settings.fontFamily),
                textAlign: "center",
                lineHeight: "1.25",
                letterSpacing: `${settings.letterSpacing + 1.2}px`,
                color: settings.customTitleColor || undefined,
              }}
            >
              {settings.coverTitle ? settings.coverTitle.split('\n').map((t, i) => (
                <div key={i}>{t}</div>
              )) : "无标题封面"}
            </h1>

            {settings.coverSubtitle && (
              <p
                id="p-cover-subtitle"
                className="opacity-90 leading-relaxed font-semibold max-w-[92%] mx-auto"
                style={{
                  fontFamily: getFontFamilyStyle(settings.coverSubtitleFont && settings.coverSubtitleFont !== 'inherit' ? settings.coverSubtitleFont : settings.fontFamily),
                  fontSize: `${coverSubtitleSizePx}px`,
                  textAlign: "center",
                  lineHeight: "1.5",
                  letterSpacing: `${settings.letterSpacing}px`,
                  color: settings.customTextColor || undefined,
                }}
              >
                {settings.coverSubtitle.split('\n').map((t, i) => (
                  <div key={i} className="mt-1">{t}</div>
                ))}
              </p>
            )}

            {/* Accent divider line */}
            <div className="w-16 h-[1.5px] bg-current opacity-20 my-3" style={{ color: settings.customTextColor || undefined }} />
          </div>

          {/* Bottom section: Author signature & Watermark */}
          {renderSignature("items-center text-center")}
        </div>
      </div>
    );
  }

  // Normal Content Page Rendering
  return (
    <div
      id={containerId}
      className={`relative w-full ${aspectRatio === "3:4" ? "aspect-[3/4]" : "aspect-[3/5]"} overflow-hidden select-none flex flex-col justify-between ${settings.customBgColor ? "" : template.bgClass} ${getRadiusClass(settings.borderRadius)} ${getShadowClass(settings.shadow)} transition-all duration-300`}
      style={{
        fontFamily: getFontFamilyStyle(settings.fontFamily),
        backgroundColor: settings.customBgColor || undefined,
        ...getBgStyle(),
      }}
    >
      {/* Template-Specific Decorations & Background Watermark */}
      {renderDecorations(template.decorations)}
      {renderBgWatermark()}

      {/* Main Content Body */}
      <div
        className="flex-1 flex flex-col justify-start overflow-hidden relative"
        style={{
          paddingTop: `${settings.padding}px`,
          paddingBottom: `${settings.padding / 2}px`,
          paddingLeft: `${settings.padding + (template.decorations === 'grid' ? 12 : 0)}px`,
          paddingRight: `${settings.padding}px`,
        }}
      >
        {/* Card Main Title */}
        {settings.showTitle && page.title && (
          <div className="mb-6">
            <h1
              id="p-card-main-title"
              className={`${settings.customTitleColor ? "" : template.titleColor} tracking-tight leading-snug`}
              style={{
                fontSize: getTitleSizeClass(settings.titleSize),
                textAlign: settings.alignment as any,
                letterSpacing: `${settings.letterSpacing}px`,
                color: settings.customTitleColor || undefined,
              }}
            >
              {page.title}
            </h1>
            {/* Elegant divider */}
            <div className="w-12 h-1 bg-gradient-to-r from-amber-400 to-rose-500 mt-3 rounded-full opacity-90" />
          </div>
        )}

        {/* Parsed content lines */}
        <div className="flex-1 flex flex-col justify-start leading-relaxed overflow-hidden">
          {parseContent(page.content)}
        </div>
      </div>

      {/* Footer Details */}
      <div
        className="flex items-center justify-between pointer-events-none shrink-0"
        style={{
          paddingBottom: `${settings.padding * 0.7}px`,
          paddingLeft: `${settings.padding + (template.decorations === 'grid' ? 12 : 0)}px`,
          paddingRight: `${settings.padding}px`,
        }}
      >
        {/* Page progress indicators */}
        {settings.showProgress ? (
          <div
            className="text-xs font-semibold px-2.5 py-1 rounded-full opacity-70 flex items-center bg-black/5 dark:bg-white/5 backdrop-blur-sm"
            style={{ color: settings.customTextColor || undefined }}
          >
            <span>{pageIndex + 1}</span>
            <span className="mx-1 opacity-50">/</span>
            <span>{totalPages}</span>
          </div>
        ) : (
          <div />
        )}

        {/* Custom signature/watermark */}
        {settings.showWatermark && settings.watermark && (
          <div
            className="text-[11px] tracking-wider opacity-60 font-bold"
            style={{ color: settings.customTextColor || undefined }}
          >
            {settings.watermark}
          </div>
        )}
      </div>
    </div>
  );
};
