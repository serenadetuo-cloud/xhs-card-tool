export interface CardSettings {
  showTitle: boolean;
  titleSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  bodySize: 'sm' | 'md' | 'lg' | 'xl';
  fontFamily: 'sans' | 'display' | 'mono' | 'serif';
  alignment: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number; // e.g. 1.4, 1.6, 1.8
  letterSpacing: number; // e.g. 0, 1, 2, 4
  padding: number; // padding inside card in px
  margin: number; // margin outside card in px
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showProgress: boolean; // "1/3" page progress
  watermark: string; // custom signature/watermark at the bottom e.g., "小红书 ID: @1234"
  showWatermark: boolean;
  highlightColor: 'yellow' | 'green' | 'pink' | 'blue' | 'purple';
  
  // Cover Settings
  showCover: boolean;
  coverTitle: string;
  coverSubtitle: string;
  coverAuthor: string;
  coverTags: string;

  // Fine-tuning Custom Colors & Multipliers
  customBgColor?: string;
  customTextColor?: string;
  customTitleColor?: string;
  customAccentColor?: string;
  coverTitleSizeMultiplier?: number;
  coverSubtitleSizeMultiplier?: number;
  coverTaglineSizeMultiplier?: number;
  bgPattern?: 'none' | 'grid' | 'dots' | 'diagonal' | 'waves';
  coverLayout?: 'classic' | 'split' | 'magazine' | 'minimal-book' | 'asymmetric' | 'bold-impact';
  coverTitleFont?: 'sans' | 'display' | 'mono' | 'serif' | 'inherit';
  coverSubtitleFont?: 'sans' | 'display' | 'mono' | 'serif' | 'inherit';
  showBgWatermark?: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  bgClass: string; // Tailwind bg class (e.g. gradient, solid, or custom grid pattern)
  cardClass?: string; // Additional classes for the card itself
  textColor: string; // Primary text color
  accentColor: string; // Accent color for headings
  titleColor: string; // Color for the title
  highlightColors: {
    yellow: string;
    green: string;
    pink: string;
    blue: string;
    purple: string;
  };
  decorations?: 'grid' | 'retro' | 'morandi' | 'minimal' | 'forest' | 'macaron' | 'sunset' | 'zhihu' | 'deepspace' | 'spring' | 'red';
}

export interface Page {
  id: string;
  content: string;
  title: string;
}

export type ToneType = 'cute' | 'professional' | 'excited' | 'storytelling' | 'brutalist';

export interface Violation {
  word: string;
  reason: string;
  suggestion: string;
}

export interface ComplianceReport {
  hasViolations: boolean;
  violations: Violation[];
}

export interface ModelConfig {
  provider: "gemini" | "openai";
  apiKey: string;
  baseUrl: string;
  model: string;
}

