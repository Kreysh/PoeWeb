'use client'

interface SparklineCellProps {
  data: number[]
  width?: number
  height?: number
  positive?: boolean
}

export function SparklineCell({ data, width = 60, height = 20, positive }: SparklineCellProps) {
  if (!data || data.length < 2) return <span className="text-[10px] text-muted-foreground">-</span>

  const filtered = data.filter(v => v !== null && v !== undefined)
  if (filtered.length < 2) return <span className="text-[10px] text-muted-foreground">-</span>

  const min = Math.min(...filtered)
  const max = Math.max(...filtered)
  const range = max - min || 1

  const points = filtered.map((val, i) => {
    const x = (i / (filtered.length - 1)) * width
    const y = height - ((val - min) / range) * (height - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const isUp = positive !== undefined ? positive : filtered[filtered.length - 1] >= filtered[0]
  const color = isUp ? '#22c55e' : '#ef4444'

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
