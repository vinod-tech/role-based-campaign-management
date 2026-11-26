// Lightweight dependency-free SVG charts.

export function Donut({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: { value: number; color: string; label: string }[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative size-44">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`${centerLabel}: ${centerValue}`}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#eef0f3" strokeWidth="14" />
          {total > 0 &&
            segments.map((s) => {
              const len = (s.value / total) * c;
              const el = (
                <circle
                  key={s.label}
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="14"
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  className="transition-all duration-500"
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums text-slate-900">{centerValue}</span>
          <span className="text-xs text-slate-500">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            {s.label} <span className="font-semibold tabular-nums text-slate-800">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AreaSpark({ data, color, label }: { data: { label: string; value: number }[]; color: string; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100;
  const h = 32;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((d, i) => [i * step, h - 2 - (d.value / max) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-16 w-full" role="img" aria-label={label}>
        <path d={area} fill={color} opacity="0.25" />
        <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export function BarList({ data, color = "#ee3a3a" }: { data: { name: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.name}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="truncate text-slate-700">{d.name}</span>
            <span className="font-semibold tabular-nums text-slate-900">{d.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
