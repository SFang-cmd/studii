interface RankIconProps {
  rank: 'bronze' | 'silver' | 'gold' | 'jade' | 'ruby' | 'diamond';
  size?: number;
}

export function RankIcon({ rank, size = 80 }: RankIconProps) {
  const colors = {
    bronze: '#CD7F32',
    silver: '#C0C0C0', 
    gold: '#FFD700',
    jade: '#059669',
    ruby: '#DC2626',
    diamond: '#B9F2FF'
  };

  const color = colors[rank];

  const shapes = {
    bronze: (
      // Rounded triangle
      <path d="M40 10 L70 65 L10 65 Z" rx="8" ry="8" />
    ),
    silver: (
      // Rounded diamond/square
      <path d="M40 15 L65 40 L40 65 L15 40 Z" rx="6" ry="6" />
    ),
    gold: (
      // Pentagon
      <path d="M40 10 L60 30 L52 55 L28 55 L20 30 Z" />
    ),
    jade: (
      // Hexagon
      <path d="M40 12 L58 25 L58 50 L40 63 L22 50 L22 25 Z" />
    ),
    ruby: (
      // Heptagon (7 sides)
      <path d="M40 8 L57 20 L63 40 L52 58 L28 58 L17 40 L23 20 Z" />
    ),
    diamond: (
      // Octagon
      <path d="M40 10 L55 18 L63 33 L63 47 L55 62 L40 70 L25 62 L17 47 L17 33 L25 18 Z" />
    )
  };

  return (
    <div className="flex items-center justify-center">
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 80 80"
        className="drop-shadow-sm"
      >
        <g fill={color} stroke="rgba(0,0,0,0.1)" strokeWidth="1">
          {shapes[rank]}
        </g>
      </svg>
    </div>
  );
}