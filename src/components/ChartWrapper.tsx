import { useEffect, useRef } from 'react';
import Chart, { ChartConfiguration } from 'chart.js/auto';

interface ChartWrapperProps {
  config: ChartConfiguration;
  height?: string; // Optional height, e.g., 'h-64'
}

export function ChartWrapper({ config, height = 'h-64' }: ChartWrapperProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
      chartInstanceRef.current = new Chart(canvasRef.current, config);
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [config]);

  return (
    <div className={height}>
      <canvas ref={canvasRef} />
    </div>
  );
}
