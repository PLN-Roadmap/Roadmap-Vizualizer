import { ScaleTime } from 'd3';
import dayjs from 'dayjs';
import { useContext } from 'react';
import { useMaxHeight } from '../../hooks/useMaxHeight';

import { PanContext } from './contexts';

interface NewRoadmapHeaderTickProps {
  scale: ScaleTime<number, number>;
  date: Date;
  // x: number;
  y: number;
  // width: number;
  height: number;
  maxX?: number;
  numberOfTicks: number;
}

export default function NewRoadmapHeaderTick({ date,  y,  height, scale, maxX, numberOfTicks }: NewRoadmapHeaderTickProps) {
  const maxH = useMaxHeight()
  const panX = useContext(PanContext)
  const startX = scale(dayjs(date).startOf('month'))
  const endX = scale(dayjs(date).endOf('month'))
  const width = (endX - startX)
  const dateLabel = dayjs(date).format('MMM YYYY')
  if (width < 0) return null

  return <g x={startX} y={y} x2={endX} transform={`translate(${panX}, 0)`}>
    <text x={startX + width/2} y={y + height/2 + 2} height={height} dominantBaseline='middle' textAnchor='middle'>
      {dateLabel}
    </text>
    <rect x={startX} y={y} width={width} height={height} style={{ fill: 'none', strokeWidth:0, stroke:'#A2D0DE' }} />
    {/* Render a small line at the start of each month */}
    <path d={`M${startX} ${y+height*.75} L${startX} ${y + height}`} style={{ fill: 'none', strokeWidth:1, stroke:'#A2D0DE' }} />
    {/* Render a small line at the end of each month */}
    <path d={`M${endX} ${y+height*.75} L${endX} ${y + height}`} style={{ fill: 'none', strokeWidth:1, stroke:'#A2D0DE' }} />
    {/* Render a dotted line spanning the full height of the svg */}
    <path d={`M${startX} ${y + height} L${startX} ${maxH}`} style={{ fill: 'none', strokeWidth:1, stroke:'#A2D0DE', strokeDasharray: '2,2' }} />
  </g>
}
