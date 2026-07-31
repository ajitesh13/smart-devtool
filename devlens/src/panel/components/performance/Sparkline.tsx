import { type FC, useMemo } from 'react'

interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  /** Tailwind stroke color class, e.g. "text-blue-500". */
  colorClass?: string
}

/**
 * Tiny inline-SVG sparkline. No external charting dependency.
 * Scales values to fit; a flat line renders mid-height.
 */
export const Sparkline: FC<SparklineProps> = ({
  values,
  width = 120,
  height = 28,
  colorClass = 'text-blue-500',
}) => {
  const path = useMemo(() => {
    if (values.length < 2) return ''
    const min = Math.min(...values)
    const max = Math.max(...values)
    const span = max - min || 1
    const stepX = width / (values.length - 1)
    return values
      .map((v, i) => {
        const x = i * stepX
        const y = height - ((v - min) / span) * (height - 2) - 1
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [values, width, height])

  if (!path) {
    return (
      <svg width={width} height={height} className="text-gray-300 dark:text-gray-600">
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      </svg>
    )
  }

  return (
    <svg width={width} height={height} className={colorClass} aria-hidden>
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}
