import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface MessageTrendChartProps {
  data: Array<{
    timestamp: number
    messages: number
  }>
  queueName?: string
}

export function MessageTrendChart({ data, queueName }: MessageTrendChartProps) {
  const chartData = {
    labels: data.map(d => {
      const date = new Date(d.timestamp)
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }),
    datasets: [
      {
        label: queueName || '消息数量',
        data: data.map(d => d.messages),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: '消息数量趋势',
        font: {
          size: 14,
          weight: 'bold',
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4" style={{ height: '300px' }}>
      <Line data={chartData} options={options} />
    </div>
  )
}
