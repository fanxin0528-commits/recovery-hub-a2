export type PixelIconName =
  | 'home'
  | 'stage'
  | 'explore'
  | 'log'
  | 'account'
  | 'body'
  | 'pain'
  | 'similar'
  | 'saved'
  | 'question'
  | 'reply'
  | 'report'
  | 'consent'
  | 'goal'
  | 'movement'
  | 'gear'
  | 'heart';

type Props = {
  name: PixelIconName;
  size?: number;
  light?: boolean;
};

const accentByName: Record<PixelIconName, string> = {
  home: '#e7b84a',
  stage: '#54a36d',
  explore: '#ffffff',
  log: '#f4fbff',
  account: '#ffffff',
  body: '#54a36d',
  pain: '#d74a55',
  similar: '#ffffff',
  saved: '#e7b84a',
  question: '#ffffff',
  reply: '#ffffff',
  report: '#d74a55',
  consent: '#54a36d',
  goal: '#e7b84a',
  movement: '#79a5cf',
  gear: '#ffffff',
  heart: '#d74a55',
};

function Shape({ name, dark, accent }: { name: PixelIconName; dark: string; accent: string }) {
  switch (name) {
    case 'home':
      return <><path d="M4 11h16v10H6v-7H4z" fill="#f7fcff" /><path d="M3 11 12 3l9 8h-4l-5-4-5 4z" fill={accent} /><path d="M10 15h4v6h-4z" fill={dark} /></>;
    case 'stage':
      return <><path d="M6 3h3v18H6z" fill={dark} /><path d="M9 4h10v8H9z" fill={accent} /><path d="M10 6h7v2h-7z" fill="#f7fcff" /></>;
    case 'explore':
      return <><path d="M5 5h10v10H5z" fill="#f7fcff" /><path d="M7 7h6v6H7z" fill={accent} /><path d="m14 14 6 6-2 2-6-6z" fill={dark} /></>;
    case 'log':
      return <><path d="M6 3h12v18H6z" fill="#f7fcff" /><path d="M9 2h6v4H9z" fill={accent} /><path d="M9 9h6v2H9zm0 4h7v2H9z" fill={dark} /></>;
    case 'account':
      return <><path d="M9 4h6v6H9z" fill={accent} /><path d="M6 14h12v6H6z" fill="#f7fcff" /><path d="M8 16h8v2H8z" fill={dark} /></>;
    case 'body':
      return <><path d="M10 3h4v4h-4zM8 8h8v4h-3v9h-2v-9H8z" fill={dark} /><path d="M5 9h3v3H5zm11 0h3v3h-3z" fill={accent} /></>;
    case 'pain':
      return <><path d="M4 18h16v3H4z" fill={dark} /><path d="M6 12h3v6H6zm5-4h3v10h-3zm5-7h3v17h-3z" fill={accent} /><path d="M6 12 12 8l3 3 5-7" stroke={dark} strokeWidth="2" fill="none" /></>;
    case 'similar':
      return <><path d="M5 5h5v5H5zm9 0h5v5h-5z" fill={accent} /><path d="M3 14h8v6H3zm10 0h8v6h-8z" fill="#f7fcff" /><path d="M5 16h4v2H5zm10 0h4v2h-4z" fill={dark} /></>;
    case 'saved':
      return <><path d="M4 8h16v12H4z" fill="#f7fcff" /><path d="M6 5h6l2 3H6z" fill={accent} /><path d="M8 12h8v2H8zm0 4h6v2H8z" fill={dark} /></>;
    case 'question':
      return <><path d="M5 5h14v10H9l-4 4z" fill="#f7fcff" /><path d="M10 8h5v4h-3v2h-2v-4h3V9h-3z" fill={dark} /><path d="M10 16h2v2h-2z" fill={accent} /></>;
    case 'reply':
      return <><path d="M4 12 11 5v5h9v5h-9v5z" fill={accent} /><path d="M7 12h10v2H7z" fill={dark} /></>;
    case 'report':
      return <><path d="M6 3h12v14H6z" fill="#f7fcff" /><path d="M10 6h4v6h-4zm0 8h4v2h-4z" fill={accent} /><path d="M5 19h14v2H5z" fill={dark} /></>;
    case 'consent':
      return <><path d="M5 4h14v16H5z" fill="#f7fcff" /><path d="M8 8h8v2H8zm0 4h8v2H8z" fill={dark} /><path d="M8 16h3v3H8zm5 0h3v3h-3z" fill={accent} /></>;
    case 'goal':
      return <><path d="M4 4h16v16H4z" fill="#f7fcff" /><path d="M7 7h10v10H7z" fill={accent} /><path d="M10 10h4v4h-4z" fill={dark} /></>;
    case 'movement':
      return <><path d="M5 17h14v4H5z" fill={dark} /><path d="M7 14h4v3H7zm4-4h4v7h-4zm4-5h4v12h-4z" fill={accent} /></>;
    case 'gear':
      return <><path d="M10 3h4v3h3v4h3v4h-3v4h-3v3h-4v-3H7v-4H4v-4h3V6h3z" fill="#f7fcff" /><path d="M10 10h4v4h-4z" fill={accent} /></>;
    case 'heart':
      return <><path d="M6 5h4v3h4V5h4v5h-2v3h-2v3h-2v3h-2v-3H8v-3H6v-3H4V5z" fill={accent} /><path d="M7 6h2v2H7z" fill="#f7fcff" /></>;
    default:
      return <path d="M5 5h14v14H5z" fill={accent} />;
  }
}

export function PixelIcon({ name, size = 22, light = false }: Props) {
  const dark = light ? '#f7fcff' : '#0a295c';
  const accent = light ? '#ffffff' : accentByName[name];
  return (
    <svg
      className="pixel-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <rect x="3" y="3" width="18" height="18" fill="none" stroke={dark} strokeWidth="1.5" />
      <Shape name={name} dark={dark} accent={accent} />
    </svg>
  );
}
