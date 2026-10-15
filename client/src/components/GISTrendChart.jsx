import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ChevronDown } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const GISTrendChart = ({
  trendData,
  stats,
  selectedRange = 'Last 14 Days',
  onSelectRange,
  isDropdownOpen,
  setIsDropdownOpen,
}) => {
  const currentPending = stats?.pending_7d ?? stats?.pending ?? trendData?.current_pending ?? 3;
  const currentInProgress = stats?.in_progress_7d ?? stats?.in_progress ?? trendData?.current_in_progress ?? 3;

  const labels = trendData?.labels || [
    'Oct 02', 'Oct 03', 'Oct 04', 'Oct 05', 'Oct 06', 'Oct 07',
    'Oct 08', 'Oct 09', 'Oct 10', 'Oct 11', 'Oct 12', 'Oct 13', 'Oct 14'
  ];

  const pendingPoints = trendData?.pending || [1, 1, 2, 2, 2, 2, 2, 2, 2, currentPending, currentPending, currentPending, currentPending];
  const inProgressPoints = trendData?.in_progress || [0, 0, 1, 1, 1, 2, 2, 2, 2, currentInProgress, currentInProgress, currentInProgress, currentInProgress];

  const activeIndex = 9;
  const activePending = currentPending;
  const activeInProgress = currentInProgress;

  const data = useMemo(() => {
    return {
      labels,
      datasets: [
        {
          label: 'Pending',
          data: pendingPoints,
          borderColor: '#1769E0',
          backgroundColor: '#1769E0',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: (ctx) => (ctx.dataIndex === activeIndex ? 6 : 0),
          pointHoverRadius: 7,
          pointBackgroundColor: (ctx) =>
            ctx.dataIndex === activeIndex ? '#1769E0' : 'transparent',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
        },
        {
          label: 'In Progress',
          data: inProgressPoints,
          borderColor: '#08B8E8',
          backgroundColor: '#08B8E8',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: (ctx) => (ctx.dataIndex === activeIndex ? 6 : 0),
          pointHoverRadius: 7,
          pointBackgroundColor: (ctx) =>
            ctx.dataIndex === activeIndex ? '#08B8E8' : 'transparent',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
        },
      ],
    };
  }, [labels, pendingPoints, inProgressPoints]);

  const maxVal = Math.max(...pendingPoints, ...inProgressPoints, activePending, activeInProgress, 4);
  const yMax = Math.max(5, Math.ceil((maxVal * 1.35)));

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          titleColor: '#111111',
          bodyColor: '#444444',
          borderColor: '#E5E7EB',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          usePointStyle: true,
        },
      },
      scales: {
        x: {
          grid: {
            color: '#F0F0F0',
            drawBorder: false,
          },
          ticks: {
            color: '#777777',
            font: {
              family: 'Inter, sans-serif',
              size: 11,
              weight: '500',
            },
            padding: 8,
          },
          border: {
            display: false,
          },
        },
        y: {
          min: 0,
          max: yMax,
          ticks: {
            stepSize: yMax <= 10 ? 1 : Math.ceil(yMax / 5),
            color: '#777777',
            font: {
              family: 'Inter, sans-serif',
              size: 11,
            },
            padding: 10,
          },
          grid: {
            color: '#F0F0F0',
            drawBorder: false,
          },
          border: {
            display: false,
          },
        },
      },
    };
  }, [yMax]);

  return (
    <div className="bg-white rounded-[12px] p-4 pt-3.5 pb-2.5 border border-[#EAEAEA] shadow-[0_1px_3px_rgba(0,0,0,0.02)] relative">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[16px] font-bold text-[#111111] tracking-tight m-0">
          Total Complaints
        </h3>

        {/* Date Filter Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#444444] bg-white border border-[#E0E0E0] rounded-[8px] hover:border-[#CCCCCC] transition-colors"
          >
            <span>{selectedRange}</span>
            <ChevronDown size={14} className="text-[#666666]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E0E0E0] rounded-[8px] shadow-lg z-30 py-1 text-[12px]">
              {['Feb 01 - Feb 14', 'Last 7 Days', 'Last 14 Days', 'Last 30 Days', 'All Time'].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => {
                    if (onSelectRange) onSelectRange(range);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-[#F5F8FF] transition-colors ${
                    selectedRange === range ? 'font-semibold text-[#1769E0] bg-[#F0F5FF]' : 'text-[#333333]'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="relative h-[225px] w-full">
        {/* Floating Legend Box matching screenshot positioned over Feb 10 */}
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: '69%',
            top: '8%',
          }}
        >
          <div className="bg-[#F6F7F9] border border-[#E0E0E0] rounded-[10px] px-3.5 py-2 shadow-xs min-w-[140px]">
            <div className="flex items-center justify-between gap-3 text-[12px] mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-[2px] bg-[#1769E0]"></span>
                <span className="font-normal text-[#333333]">Pending</span>
              </div>
              <span className="font-bold text-[#111111]">{activePending}</span>
            </div>

            <div className="flex items-center justify-between gap-3 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-[2px] bg-[#08B8E8]"></span>
                <span className="font-normal text-[#333333]">In Progress</span>
              </div>
              <span className="font-bold text-[#111111]">{activeInProgress}</span>
            </div>
          </div>
        </div>

        {/* Outer Halo Circle on Feb 10 Data Point */}
        <div
          className="absolute rounded-full border border-[#1769E0]/40 pointer-events-none"
          style={{
            width: '18px',
            height: '18px',
            left: '75.2%',
            top: '55.5%',
            transform: 'translate(-50%, -50%)',
          }}
        ></div>

        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default GISTrendChart;
