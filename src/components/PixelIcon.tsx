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

type ShapeProps = {
  name: PixelIconName;
  ink: string;
  fill: string;
  hi: string;
  shade: string;
  alert: string;
  success: string;
  gold: string;
};

const fills: Record<PixelIconName, string> = {
  home: '#f7fcff',
  stage: '#54a36d',
  explore: '#f7fcff',
  log: '#f7fcff',
  account: '#f7fcff',
  body: '#54a36d',
  pain: '#d74a55',
  similar: '#f7fcff',
  saved: '#e7b84a',
  question: '#f7fcff',
  reply: '#f7fcff',
  report: '#d74a55',
  consent: '#f7fcff',
  goal: '#e7b84a',
  movement: '#79a5cf',
  gear: '#f7fcff',
  heart: '#d74a55',
};

function Shape({ name, ink, fill, hi, shade, alert, success, gold }: ShapeProps) {
  switch (name) {
    case 'home':
      return (
        <>
          <path d="M5 11h14v10H5z" fill={ink} />
          <path d="M7 12h10v7H7z" fill={fill} />
          <path d="M3 11h3V8h2V6h2V4h4v2h2v2h2v3h3v2h-5v-2h-2V9h-4v2H8v2H3z" fill={ink} />
          <path d="M8 10h2V8h2V6h2v2h2v2h2v1H8z" fill={gold} />
          <path d="M10 15h4v6h-4z" fill={ink} />
          <path d="M8 13h3v2H8z" fill={hi} />
        </>
      );
    case 'stage':
      return (
        <>
          <path d="M5 3h3v18H5zM3 20h8v2H3z" fill={ink} />
          <path d="M8 4h11v9H8z" fill={ink} />
          <path d="M10 6h7v2h-7z" fill={hi} />
          <path d="M10 8h8v3h-8z" fill={success} />
          <path d="M18 8h2v3h-2z" fill={ink} />
          <path d="M8 13h9v3H8z" fill={shade} />
        </>
      );
    case 'explore':
      return (
        <>
          <path d="M4 5h2V3h9v2h2v9h-2v2H6v-2H4z" fill={ink} />
          <path d="M7 6h7v2H7zM6 8h9v5H6z" fill={fill} />
          <path d="M8 7h4v2H8z" fill={hi} />
          <path d="M14 14h3v2h2v2h2v3h-3v-2h-2v-2h-2z" fill={ink} />
          <path d="M16 16h2v2h-2z" fill={shade} />
        </>
      );
    case 'log':
      return (
        <>
          <path d="M6 3h12v19H6z" fill={ink} />
          <path d="M8 6h8v14H8z" fill={fill} />
          <path d="M10 2h4v2h3v4H7V4h3z" fill={ink} />
          <path d="M10 4h4v2h-4z" fill={gold} />
          <path d="M10 10h5v2h-5zM10 14h6v2h-6z" fill={shade} />
          <path d="M8 6h3v2H8z" fill={hi} />
        </>
      );
    case 'account':
      return (
        <>
          <path d="M9 3h6v2h2v6h-2v2H9v-2H7V5h2z" fill={ink} />
          <path d="M10 5h4v2h1v3h-1v1h-4v-1H9V7h1z" fill={fill} />
          <path d="M5 16h2v-2h10v2h2v5H5z" fill={ink} />
          <path d="M8 16h8v3H8z" fill={fill} />
          <path d="M10 6h2v2h-2z" fill={hi} />
        </>
      );
    case 'body':
      return (
        <>
          <path d="M10 3h4v5h-4zM8 8h8v4h-3v3h3v3h-3v4h-4v-8H8z" fill={ink} />
          <path d="M10 9h4v2h-4zM11 15h3v2h-3z" fill={success} />
          <path d="M5 9h3v3H5zm11 0h3v3h-3z" fill={shade} />
          <path d="M11 4h2v2h-2z" fill={hi} />
        </>
      );
    case 'pain':
      return (
        <>
          <path d="M4 19h16v3H4z" fill={ink} />
          <path d="M5 13h4v6H5zM10 9h4v10h-4zM15 5h4v14h-4z" fill={ink} />
          <path d="M6 14h2v4H6zM11 10h2v8h-2zM16 6h2v12h-2z" fill={alert} />
          <path d="M4 12h3v-2h4V8h3V6h5V4h2v5h-2V7h-4v3h-3v2H8v2H4z" fill={ink} />
          <path d="M16 6h2v2h-2z" fill={hi} />
        </>
      );
    case 'similar':
      return (
        <>
          <path d="M5 5h5v5H5zM14 4h5v5h-5z" fill={ink} />
          <path d="M6 6h3v3H6zM15 5h3v3h-3z" fill={fill} />
          <path d="M3 14h9v7H3zM12 13h9v8h-9z" fill={ink} />
          <path d="M5 16h5v3H5zM14 15h5v4h-5z" fill={fill} />
          <path d="M10 11h4v2h-4z" fill={gold} />
        </>
      );
    case 'saved':
      return (
        <>
          <path d="M3 8h18v13H3z" fill={ink} />
          <path d="M5 10h14v9H5z" fill={fill} />
          <path d="M5 5h7l2 3h7v4H3V7h2z" fill={ink} />
          <path d="M6 7h6l2 2h5v1H5V8h1z" fill={gold} />
          <path d="M10 13h4v3h-4z" fill={ink} />
          <path d="M6 10h5v1H6z" fill={hi} />
        </>
      );
    case 'question':
      return (
        <>
          <path d="M4 5h16v11h-3v2h-4v2H9v-4H4z" fill={ink} />
          <path d="M6 7h12v7h-3v2h-4v-2H6z" fill={fill} />
          <path d="M10 8h5v2h1v3h-3v2h-3v-4h3v-1h-3z" fill={ink} />
          <path d="M10 17h3v2h-3z" fill={gold} />
          <path d="M7 7h5v1H7z" fill={hi} />
        </>
      );
    case 'reply':
      return (
        <>
          <path d="M3 12h2v-2h2V8h2V6h4v4h8v7h-8v4H9v-2H7v-2H5v-2H3z" fill={ink} />
          <path d="M9 11h9v3H9v2h2v1l-4-4 4-4v2z" fill={fill} />
          <path d="M10 12h6v1h-6z" fill={shade} />
        </>
      );
    case 'report':
      return (
        <>
          <path d="M5 3h14v16H5z" fill={ink} />
          <path d="M7 5h10v12H7z" fill={fill} />
          <path d="M10 6h4v7h-4zM10 15h4v2h-4z" fill={alert} />
          <path d="M4 20h16v2H4z" fill={ink} />
          <path d="M8 5h5v1H8z" fill={hi} />
        </>
      );
    case 'consent':
      return (
        <>
          <path d="M5 3h14v18H5z" fill={ink} />
          <path d="M7 5h10v14H7z" fill={fill} />
          <path d="M9 8h6v2H9zM9 12h5v2H9z" fill={shade} />
          <path d="M9 16h3v3H9zM14 16h3v3h-3z" fill={ink} />
          <path d="M10 17h1v1h-1zm5 0h1v1h-1z" fill={success} />
        </>
      );
    case 'goal':
      return (
        <>
          <path d="M4 5h13v2h3v12H4z" fill={ink} />
          <path d="M6 7h10v10H6z" fill={fill} />
          <path d="M8 9h6v6H8z" fill={gold} />
          <path d="M10 11h2v2h-2z" fill={ink} />
          <path d="M17 8h3v8h-3z" fill={alert} />
        </>
      );
    case 'movement':
      return (
        <>
          <path d="M4 18h16v3H4z" fill={ink} />
          <path d="M6 14h4v4H6zM10 10h4v8h-4zM14 6h4v12h-4z" fill={ink} />
          <path d="M7 15h2v2H7zM11 11h2v6h-2zM15 7h2v10h-2z" fill={shade} />
          <path d="M16 4h3v2h-3zM13 8h2v2h-2zM9 12h2v2H9z" fill={gold} />
        </>
      );
    case 'gear':
      return (
        <>
          <path d="M10 2h4v3h3v2h3v4h-3v2h3v4h-3v2h-3v3h-4v-3H7v-2H4v-4h3v-2H4V7h3V5h3z" fill={ink} />
          <path d="M10 7h4v2h2v6h-2v2h-4v-2H8V9h2z" fill={fill} />
          <path d="M11 10h2v4h-2z" fill={shade} />
          <path d="M10 7h3v1h-3z" fill={hi} />
        </>
      );
    case 'heart':
      return (
        <>
          <path d="M6 4h4v2h4V4h4v2h2v6h-2v3h-2v2h-2v2h-4v-2H8v-2H6v-3H4V6h2z" fill={ink} />
          <path d="M7 7h4v3h2V7h4v4h-2v3h-2v2h-2v-2H9v-3H7z" fill={alert} />
          <path d="M7 7h2v2H7z" fill={hi} />
        </>
      );
    default:
      return <path d="M5 5h14v14H5z" fill={fill} />;
  }
}

export function PixelIcon({ name, size = 22, light = false }: Props) {
  const ink = light ? '#f7fcff' : '#0a295c';
  const fill = light ? '#d8f0ff' : fills[name];
  const hi = light ? '#ffffff' : '#ffffff';
  const shade = light ? '#a8d7ff' : '#79a5cf';
  const alert = light ? '#ffffff' : '#d74a55';
  const success = light ? '#ffffff' : '#54a36d';
  const gold = light ? '#ffffff' : '#e7b84a';
  const showShadow = size >= 24 && !light;

  return (
    <svg
      className="pixel-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {showShadow ? <path d="M5 21h14v2H5zM19 7h2v14h-2z" fill="rgba(5, 23, 54, .18)" /> : null}
      <Shape name={name} ink={ink} fill={fill} hi={hi} shade={shade} alert={alert} success={success} gold={gold} />
    </svg>
  );
}
