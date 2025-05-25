'use client';

import { useState } from 'react';
import { Line } from 'react-chartjs-2';
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
import { phoneData, chartDatasets, chartLabels } from '../data/phones';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: '#ffffff',
        font: {
          size: 13,
        },
        padding: 20,
        usePointStyle: true,
      },
    },
    title: {
      display: false,
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: '等效焦段 (mm)',
        color: '#ffffff',
        font: {
          size: 14,
        },
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        color: '#ffffff',
      },
    },
    y: {
      title: {
        display: true,
        text: '等效光圈 (f值)',
        color: '#ffffff',
        font: {
          size: 14,
        },
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        color: '#ffffff',
        callback: function(value: number | string) {
          return `f/${value}`;
        },
      },
      min: 1.0,
      max: 5.0,
    },
  },
};

export default function Home() {
  const [visibleDatasets, setVisibleDatasets] = useState<string[]>(
    chartDatasets.map(dataset => dataset.label)
  );
  const [activeView, setActiveView] = useState<'chart' | 'ranking'>('chart');

  const toggleDataset = (label: string) => {
    setVisibleDatasets(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const getPhoneColor = (phoneName: string) => {
    const dataset = chartDatasets.find(d => d.label === phoneName);
    return dataset ? dataset.borderColor : '#6B7280';
  };

  const isPhoneVisible = (phoneName: string) => {
    return visibleDatasets.includes(phoneName);
  };

  // 动态生成图表数据
  const chartData = {
    labels: chartLabels,
    datasets: chartDatasets.filter(dataset => 
      visibleDatasets.includes(dataset.label)
    ),
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <button className="p-2 rounded-full bg-gray-800 hover:bg-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-bold">等效光圈曲线 - 手机摄像头</h1>
              <p className="text-gray-400 text-sm mt-1">
                基于不同焦段下手机后置摄像头的等效光圈大小对比
              </p>
            </div>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {/* Chart Section */}
        <div className="bg-slate-800 rounded-lg p-6 mb-8 border border-slate-700">
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setActiveView('chart')}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                activeView === 'chart' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              查看曲线
            </button>
            <button 
              onClick={() => setActiveView('ranking')}
              className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                activeView === 'ranking' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              查看排行
            </button>
          </div>
          
          <div className="h-80 mb-6">
            <Line data={chartData} options={chartOptions} />
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2 text-gray-300">等效光圈 多核 (分)</h3>
            <div className="text-4xl font-bold mb-4 text-white">0</div>
          </div>
        </div>

        {/* Device Categories */}
        <div className="space-y-8">
          {/* 小米机型 */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">小米机型</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {phoneData.xiaomi.map((phone, index) => {
                const isVisible = isPhoneVisible(phone.name);
                const phoneColor = getPhoneColor(phone.name);
                return (
                  <div
                    key={index}
                    onClick={() => toggleDataset(phone.name)}
                    className={`rounded-lg p-3 cursor-pointer transition-all duration-200 border ${
                      isVisible 
                        ? 'bg-orange-500 hover:bg-orange-400 border-orange-400 shadow-md' 
                        : 'bg-slate-700 hover:bg-slate-600 border-slate-600'
                    }`}
                    style={isVisible ? { borderColor: phoneColor } : {}}
                  >
                    <div className="font-medium text-white text-sm mb-1">{phone.name}</div>
                    <div className="text-white text-xs opacity-80">发布时间：{phone.releaseDate}</div>
                    <div className="text-white text-xs opacity-80">光圈：{phone.aperture}</div>
                    <div className="text-white text-xs opacity-80">焦段：{phone.focalLength}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 三星机型 */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">三星机型</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {phoneData.samsung.map((phone, index) => {
                const isVisible = isPhoneVisible(phone.name);
                const phoneColor = getPhoneColor(phone.name);
                return (
                  <div
                    key={index}
                    onClick={() => toggleDataset(phone.name)}
                    className={`rounded-lg p-3 cursor-pointer transition-all duration-200 border ${
                      isVisible 
                        ? 'bg-blue-500 hover:bg-blue-400 border-blue-400 shadow-md' 
                        : 'bg-slate-700 hover:bg-slate-600 border-slate-600'
                    }`}
                    style={isVisible ? { borderColor: phoneColor } : {}}
                  >
                    <div className="font-medium text-white text-sm mb-1">{phone.name}</div>
                    <div className="text-white text-xs opacity-80">发布时间：{phone.releaseDate}</div>
                    <div className="text-white text-xs opacity-80">光圈：{phone.aperture}</div>
                    <div className="text-white text-xs opacity-80">焦段：{phone.focalLength}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 苹果机型 */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">苹果机型</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {phoneData.apple.map((phone, index) => {
                const isVisible = isPhoneVisible(phone.name);
                const phoneColor = getPhoneColor(phone.name);
                return (
                  <div
                    key={index}
                    onClick={() => toggleDataset(phone.name)}
                    className={`rounded-lg p-3 cursor-pointer transition-all duration-200 border ${
                      isVisible 
                        ? 'bg-green-500 hover:bg-green-400 border-green-400 shadow-md' 
                        : 'bg-slate-700 hover:bg-slate-600 border-slate-600'
                    }`}
                    style={isVisible ? { borderColor: phoneColor } : {}}
                  >
                    <div className="font-medium text-white text-sm mb-1">{phone.name}</div>
                    <div className="text-white text-xs opacity-80">发布时间：{phone.releaseDate}</div>
                    <div className="text-white text-xs opacity-80">光圈：{phone.aperture}</div>
                    <div className="text-white text-xs opacity-80">焦段：{phone.focalLength}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 华为机型 */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">华为机型</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {phoneData.huawei.map((phone, index) => {
                const isVisible = isPhoneVisible(phone.name);
                const phoneColor = getPhoneColor(phone.name);
                return (
                  <div
                    key={index}
                    onClick={() => toggleDataset(phone.name)}
                    className={`rounded-lg p-3 cursor-pointer transition-all duration-200 border ${
                      isVisible 
                        ? 'bg-red-500 hover:bg-red-400 border-red-400 shadow-md' 
                        : 'bg-slate-700 hover:bg-slate-600 border-slate-600'
                    }`}
                    style={isVisible ? { borderColor: phoneColor } : {}}
                  >
                    <div className="font-medium text-white text-sm mb-1">{phone.name}</div>
                    <div className="text-white text-xs opacity-80">发布时间：{phone.releaseDate}</div>
                    <div className="text-white text-xs opacity-80">光圈：{phone.aperture}</div>
                    <div className="text-white text-xs opacity-80">焦段：{phone.focalLength}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* OPPO机型 */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">OPPO机型</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {phoneData.oppo.map((phone, index) => {
                const isVisible = isPhoneVisible(phone.name);
                const phoneColor = getPhoneColor(phone.name);
                return (
                  <div
                    key={index}
                    onClick={() => toggleDataset(phone.name)}
                    className={`rounded-lg p-3 cursor-pointer transition-all duration-200 border ${
                      isVisible 
                        ? 'bg-purple-500 hover:bg-purple-400 border-purple-400 shadow-md' 
                        : 'bg-slate-700 hover:bg-slate-600 border-slate-600'
                    }`}
                    style={isVisible ? { borderColor: phoneColor } : {}}
                  >
                    <div className="font-medium text-white text-sm mb-1">{phone.name}</div>
                    <div className="text-white text-xs opacity-80">发布时间：{phone.releaseDate}</div>
                    <div className="text-white text-xs opacity-80">光圈：{phone.aperture}</div>
                    <div className="text-white text-xs opacity-80">焦段：{phone.focalLength}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* vivo机型 */}
          <section>
            <h2 className="text-xl font-bold mb-4 text-white">vivo机型</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {phoneData.vivo.map((phone, index) => {
                const isVisible = isPhoneVisible(phone.name);
                const phoneColor = getPhoneColor(phone.name);
                return (
                  <div
                    key={index}
                    onClick={() => toggleDataset(phone.name)}
                    className={`rounded-lg p-3 cursor-pointer transition-all duration-200 border ${
                      isVisible 
                        ? 'bg-indigo-500 hover:bg-indigo-400 border-indigo-400 shadow-md' 
                        : 'bg-slate-700 hover:bg-slate-600 border-slate-600'
                    }`}
                    style={isVisible ? { borderColor: phoneColor } : {}}
                  >
                    <div className="font-medium text-white text-sm mb-1">{phone.name}</div>
                    <div className="text-white text-xs opacity-80">发布时间：{phone.releaseDate}</div>
                    <div className="text-white text-xs opacity-80">光圈：{phone.aperture}</div>
                    <div className="text-white text-xs opacity-80">焦段：{phone.focalLength}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
