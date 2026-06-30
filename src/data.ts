import { Template, CardSettings, Page } from "./types";

export const TEMPLATES: Template[] = [
  {
    id: "simple-grid",
    name: "简单格子",
    description: "经典清新网格，配可爱小四角星装饰",
    bgClass: "bg-white",
    cardClass: "border border-neutral-100 relative",
    textColor: "text-neutral-700",
    accentColor: "text-emerald-600",
    titleColor: "text-neutral-950 font-bold",
    highlightColors: {
      yellow: "bg-yellow-100 text-neutral-800 px-1 rounded-sm",
      green: "bg-emerald-100 text-neutral-800 px-1 rounded-sm",
      pink: "bg-rose-100 text-neutral-800 px-1 rounded-sm",
      blue: "bg-sky-100 text-neutral-800 px-1 rounded-sm",
      purple: "bg-purple-100 text-neutral-800 px-1 rounded-sm"
    },
    decorations: "grid"
  },
  {
    id: "retro-memo",
    name: "复古便签",
    description: "温暖羊皮纸色，搭配复古回形针视觉效果",
    bgClass: "bg-[#F9F5EB]",
    cardClass: "border border-[#EAE3D2]/50 shadow-md",
    textColor: "text-[#3F3B3B]",
    accentColor: "text-[#805A3B]",
    titleColor: "text-[#1E1C1C] font-semibold border-b border-[#EAE3D2] pb-2",
    highlightColors: {
      yellow: "bg-[#F3E5AB] text-[#3F3B3B] px-1 rounded-sm border-b-2 border-yellow-400",
      green: "bg-[#D5E8D4] text-[#3F3B3B] px-1 rounded-sm border-b-2 border-emerald-400",
      pink: "bg-[#FADAD8] text-[#3F3B3B] px-1 rounded-sm border-b-2 border-rose-400",
      blue: "bg-[#D0E1FD] text-[#3F3B3B] px-1 rounded-sm border-b-2 border-sky-400",
      purple: "bg-[#E6D5FC] text-[#3F3B3B] px-1 rounded-sm border-b-2 border-purple-400"
    },
    decorations: "retro"
  },
  {
    id: "minimal-white",
    name: "高级纯白",
    description: "高级感十足的白色画幅与清晰的无衬线排版",
    bgClass: "bg-white",
    textColor: "text-neutral-800",
    accentColor: "text-black",
    titleColor: "text-neutral-950 font-extrabold tracking-tight pb-1",
    highlightColors: {
      yellow: "bg-yellow-200 text-black font-medium px-1 rounded-sm",
      green: "bg-green-200 text-black font-medium px-1 rounded-sm",
      pink: "bg-pink-200 text-black font-medium px-1 rounded-sm",
      blue: "bg-blue-200 text-black font-medium px-1 rounded-sm",
      purple: "bg-purple-200 text-black font-medium px-1 rounded-sm"
    },
    decorations: "minimal"
  },
  {
    id: "minimal-black",
    name: "极夜曜黑",
    description: "深邃的曜石黑色画布，高反差荧光感突出",
    bgClass: "bg-neutral-950",
    textColor: "text-neutral-300",
    accentColor: "text-white",
    titleColor: "text-white font-extrabold tracking-tight border-b border-neutral-800 pb-2",
    highlightColors: {
      yellow: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-1 rounded-sm",
      green: "bg-green-500/20 text-green-300 border border-green-500/30 px-1 rounded-sm",
      pink: "bg-pink-500/20 text-pink-300 border border-pink-500/30 px-1 rounded-sm",
      blue: "bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1 rounded-sm",
      purple: "bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1 rounded-sm"
    },
    decorations: "minimal"
  },
  {
    id: "sunset-glow",
    name: "落日余晖",
    description: "高饱和度的落日橘红渐变，具有极强的情感主角感",
    bgClass: "bg-gradient-to-tr from-[#FF5E62] via-[#FF7A50] to-[#FF9966]",
    textColor: "text-[#3D1414]",
    accentColor: "text-[#1E0303]",
    titleColor: "text-neutral-950 font-extrabold tracking-tight pb-1",
    highlightColors: {
      yellow: "bg-yellow-100/90 text-[#3D1414] px-1 rounded-sm font-semibold",
      green: "bg-emerald-100/90 text-[#3D1414] px-1 rounded-sm font-semibold",
      pink: "bg-rose-100/90 text-[#3D1414] px-1 rounded-sm font-semibold",
      blue: "bg-sky-100/90 text-[#3D1414] px-1 rounded-sm font-semibold",
      purple: "bg-purple-100/90 text-[#3D1414] px-1 rounded-sm font-semibold"
    },
    decorations: "sunset"
  },
  {
    id: "zhihu-intellectual",
    name: "知乎知性",
    description: "经典干净学术灰底，搭配庄重衬线标题",
    bgClass: "bg-[#F5F7F8]",
    textColor: "text-neutral-800",
    accentColor: "text-neutral-900 font-serif",
    titleColor: "text-neutral-950 font-serif font-black tracking-normal border-b-2 border-neutral-800 pb-2.5",
    highlightColors: {
      yellow: "bg-amber-100 text-neutral-900 px-1 rounded-sm font-semibold",
      green: "bg-emerald-100 text-neutral-900 px-1 rounded-sm font-semibold",
      pink: "bg-rose-100 text-neutral-900 px-1 rounded-sm font-semibold",
      blue: "bg-sky-100 text-neutral-900 px-1 rounded-sm font-semibold",
      purple: "bg-purple-100 text-neutral-900 px-1 rounded-sm font-semibold"
    },
    decorations: "zhihu"
  },
  {
    id: "official-red",
    name: "大红爆款",
    description: "正宗小红书品牌红，视觉锤冲击，极为吸睛",
    bgClass: "bg-[#FF2442]",
    textColor: "text-white/95",
    accentColor: "text-yellow-300 font-black",
    titleColor: "text-white font-black text-center pb-1",
    highlightColors: {
      yellow: "bg-yellow-300 text-neutral-900 px-1.5 rounded-sm font-bold",
      green: "bg-emerald-300 text-neutral-900 px-1.5 rounded-sm font-bold",
      pink: "bg-pink-300 text-neutral-900 px-1.5 rounded-sm font-bold",
      blue: "bg-sky-300 text-neutral-900 px-1.5 rounded-sm font-bold",
      purple: "bg-fuchsia-300 text-neutral-900 px-1.5 rounded-sm font-bold"
    },
    decorations: "red"
  },
  {
    id: "fashion-nude",
    name: "摩登时尚",
    description: "温柔高级的裸色与莫兰迪茶粉，高级温润，充满轻奢杂志质感。非常适合穿搭、美妆与时尚博主",
    bgClass: "bg-gradient-to-br from-[#F5ECE5] to-[#EADCD2]",
    textColor: "text-[#4E3629]",
    accentColor: "text-[#8A5A44]",
    titleColor: "text-[#3E2723] font-black tracking-tight border-b-2 border-[#8A5A44]/30 pb-2",
    highlightColors: {
      yellow: "bg-[#F4D35E]/30 text-[#4E3629] px-1.5 rounded-sm",
      green: "bg-[#D8E2DC] text-[#4E3629] px-1.5 rounded-sm",
      pink: "bg-[#FBC3BC]/40 text-[#4E3629] px-1.5 rounded-sm",
      blue: "bg-[#DBE2EF] text-[#4E3629] px-1.5 rounded-sm",
      purple: "bg-[#E0B1CB]/35 text-[#4E3629] px-1.5 rounded-sm"
    },
    decorations: "morandi"
  },
  {
    id: "morandi-sage",
    name: "森林莫兰迪",
    description: "温润低饱和度灰绿，静谧森林的高级留白感，适合情感、生活、读书博主",
    bgClass: "bg-gradient-to-br from-[#E2ECE9] to-[#C8D6D1]",
    textColor: "text-[#2C3E35]",
    accentColor: "text-[#4F6D60]",
    titleColor: "text-[#1C2C24] font-black pb-1",
    highlightColors: {
      yellow: "bg-[#F3E5AB] text-[#2C3E35] px-1 rounded-sm",
      green: "bg-[#A7D7C5]/30 text-[#2C3E35] px-1 rounded-sm",
      pink: "bg-[#F7D6D0] text-[#2C3E35] px-1 rounded-sm",
      blue: "bg-[#CBE3F5] text-[#2C3E35] px-1 rounded-sm",
      purple: "bg-[#E6D5FC] text-[#2C3E35] px-1 rounded-sm"
    },
    decorations: "morandi"
  },
  {
    id: "champagne-gold",
    name: "香槟轻奢",
    description: "高贵丝滑奶油香槟金，极简而富有奢华杂志质感，适合搞钱、成长、职场干货",
    bgClass: "bg-gradient-to-br from-[#FAF5F0] via-[#F4EDE4] to-[#E9DFD3]",
    textColor: "text-[#433A31]",
    accentColor: "text-[#8E7E6B]",
    titleColor: "text-[#2E251B] font-extrabold pb-1",
    highlightColors: {
      yellow: "bg-[#F4D35E]/20 text-[#433A31] px-1.5 rounded-sm",
      green: "bg-[#D8E2DC]/80 text-[#433A31] px-1.5 rounded-sm",
      pink: "bg-[#FADAD8]/80 text-[#433A31] px-1.5 rounded-sm",
      blue: "bg-[#DBE2EF]/80 text-[#433A31] px-1.5 rounded-sm",
      purple: "bg-[#E0B1CB]/30 text-[#433A31] px-1.5 rounded-sm"
    },
    decorations: "minimal"
  },
  {
    id: "ocean-mist",
    name: "静谧晨雾",
    description: "温润柔和的灰蓝色调，静谧幽深，适合极简科技、自律成长、干货排版",
    bgClass: "bg-gradient-to-tr from-[#E6EEF8] via-[#F0F4FA] to-[#DFE9F5]",
    textColor: "text-[#2B3A4A]",
    accentColor: "text-[#4A647E]",
    titleColor: "text-[#1A2633] font-black pb-1",
    highlightColors: {
      yellow: "bg-[#FDF6E2] text-[#2B3A4A] px-1.5 rounded-sm",
      green: "bg-[#E2F0D9] text-[#2B3A4A] px-1.5 rounded-sm",
      pink: "bg-[#FCE4EC] text-[#2B3A4A] px-1.5 rounded-sm",
      blue: "bg-[#E3F2FD] text-[#2B3A4A] px-1.5 rounded-sm",
      purple: "bg-[#EDE7F6] text-[#2B3A4A] px-1.5 rounded-sm"
    },
    decorations: "minimal"
  },
  {
    id: "neon-cyber",
    name: "霓虹深空",
    description: "炫酷高对比黑紫霓虹，自带赛博极客氛围，适合前沿AI、干货代码与数码科技",
    bgClass: "bg-gradient-to-br from-[#0F101A] via-[#141524] to-[#1A1C30]",
    textColor: "text-[#B3B9D1]",
    accentColor: "text-[#E0245E] font-bold",
    titleColor: "text-white font-black tracking-tight pb-1",
    highlightColors: {
      yellow: "bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/30 px-1 rounded-sm",
      green: "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 px-1 rounded-sm",
      pink: "bg-[#EC4899]/20 text-[#F472B6] border border-[#EC4899]/30 px-1 rounded-sm",
      blue: "bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30 px-1 rounded-sm",
      purple: "bg-[#8B5CF6]/20 text-[#A78BFA] border border-[#8B5CF6]/30 px-1 rounded-sm"
    },
    decorations: "deepspace"
  }
];

export const DEFAULT_SETTINGS: CardSettings = {
  showTitle: true,
  titleSize: 'md',
  bodySize: 'sm',
  fontFamily: 'sans',
  alignment: 'left',
  lineHeight: 1.6,
  letterSpacing: 0,
  padding: 40,
  margin: 12,
  borderRadius: 'none',
  shadow: 'lg',
  showProgress: true,
  watermark: "小红书 ID: @灵感画板",
  showWatermark: true,
  highlightColor: 'yellow',
  bgPattern: 'none',
  coverLayout: 'classic',
  coverTitleFont: 'inherit',
  coverSubtitleFont: 'inherit',
  showBgWatermark: true,
  
  // Default cover fields
  showCover: true,
  coverTitle: "小红书爆款文案的5个底层逻辑",
  coverSubtitle: "零基础教你写出十万赞的文案秘籍，实现副业变现",
  coverAuthor: "李书锋Finn",
  coverTags: "运营干货 • 成长思考",

  // Cover Sizing Multipliers
  coverTitleSizeMultiplier: 1.0,
  coverSubtitleSizeMultiplier: 1.0,
  coverTaglineSizeMultiplier: 1.0
};

export const POPULAR_EMOJIS = [
  "📌", "🔥", "✨", "💡", "📢", "⬇️", "✅", "❌", "🎨", "🚀", "❤️", "🙌", "👑", "🌟", "🤩", 
  "💯", "🎉", "📅", "🌈", "🍉", "☕", "📖", "🧭", "💼", "🌿", "🐈", "🧸", "💌", "💅", "💎"
];

export const SAMPLE_NOTE: Page = {
  id: "sample-1",
  title: "小红书爆款文案的5个底层逻辑",
  content: `你好，我是李书锋Finn。

🌿==没人带路的日子，真的难==

当年刚毕业，拿着985工科的毕业证，我站在了人生的十字路口。
出身普通工薪家庭，面对“未来该做什么”这个问题，父母给不出确切的答案。我也曾四处求教，但老师和学长给出的路，似乎只有“去研究所”或“进央国企”这两条。
外面的世界到底长什么样？没人说得清。
我清楚地知道自己不想做技术，却又不知道自己能做什么，能做好什么。那时候，每天刷着招聘网站，越刷越心慌。那种感觉，就像在浓雾里赶路，很迷茫，也很无力。

---

🔍==第一步：找到你的黄金圈==

很多时候，我们写文案只是在“写”，却没有思考“为什么写”。
💡爆款公式：
- **黄金开头**：前3秒决定读者要不要停留。
- **痛点共鸣**：戳中读者的现实焦虑或心愿。
- **干货输出**：提供马上就能用起来的实操指南。
- **高赞金句**：一句能让人截图保存的温暖金句。

---

📝==第二步：用生活感细节打动人心==

不要写“今天天气很冷”，要写：
🐈“风吹在脸上像刀子割，小橘猫缩在空调外机下发抖。”
具体的画面感，才是流量的通行证！
小红书用户最爱看的就是「烟火气」和「真实感」。

---

🎯==第三步：打造视觉舒适感==

就像你现在看到的这张卡片一样：
- 字号：标题要大，正文要适中。
- 排版：呼吸感留白，不能挤在一块。
- 重点：用==荧光笔划重点==，让人一眼看到关键。`
};
