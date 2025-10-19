import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface MessageRateChartProps {
  queues: Array<{
    name: string
    publishRate: number
    deliverRate: number
    ackRate: number
  }>
}

export function MessageRateChart({ queues }: MessageRateChartProps) {
  const chartData = {
    labels: queues.map(q => q.name),
    datasets: [
      {
        label: '发布速率 (msg/s)',
        data: queues.map(q => q.publishRate),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: '投递速率 (msg/s)',
        data: queues.map(q => q.deliverRate),
        backgroundColor: 'rgba(34, 197, 94, 0.7)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1,
      },
      {
        label: '确认速率 (msg/s)',
        data: queues.map(q => q.ackRate),
        backgroundColor: 'rgba(249, 115, 22, 0.7)',
        borderColor: 'rgb(249, 115, 22)',
        borderWidth: 1,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '消息速率 (msg/s)',
        font: {
          size: 14,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.y ?? 0
            return `${context.dataset.label}: ${value.toFixed(2)} msg/s`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            if (typeof value === 'number') {
              return value.toFixed(1)
            }
            return value
          },
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4" style={{ height: '300px' }}>
      <Bar data={chartData} options={options} />
    </div>
  )
}
