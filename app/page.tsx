'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 -z-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 70px)`,
        }}></div>
      </div>

      {/* Header */}
      <header className="text-center py-8 relative z-10">
        <div className="flex items-center justify-center mb-4">
          <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center mr-3">
            <span className="text-black font-bold text-sm">📱</span>
          </div>
          <h1 className="text-2xl font-bold text-cyan-400">HANS的手机摄像头数据库</h1>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">手机硬件排行</h2>
      </header>

      {/* Main Content Grid */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
          
          {/* 等效光圈 */}
          <Link 
            href="/comparison"
            className="group bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/10"
          >
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">手机摄像头</h3>
                <h3 className="text-xl font-bold text-cyan-400">等效光圈</h3>
              </div>
            </div>
            <div className="text-gray-300 text-sm leading-relaxed">
              等效光圈越大，暗光环境下的成像效果越好，虚化更强。
            </div>
            <div className="mt-4 text-xs text-gray-500">
              已收录 200+ 机型数据
            </div>
          </Link>

          {/* 等效传感器大小 - 现已启用 */}
          <Link 
            href="/sensor-size"
            className="group bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/10"
          >
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">手机摄像头</h3>
                <h3 className="text-xl font-bold text-cyan-400">等效传感器大小</h3>
              </div>
            </div>
            <div className="text-gray-300 text-sm leading-relaxed">
              等效传感器大小越大，信噪比越高则画质更好，动态范围越好。
            </div>
            <div className="mt-4 text-xs text-gray-500">
              已收录 200+ 机型数据
            </div>
          </Link>

          {/* 预留位置1 */}
          <div className="group bg-gray-900/20 backdrop-blur-sm border border-gray-600/30 rounded-2xl p-8 opacity-40">
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-600 mb-1">更多功能</h3>
                <h3 className="text-xl font-bold text-gray-600">敬请期待</h3>
              </div>
            </div>
            <div className="text-gray-600 text-sm leading-relaxed">
              更多手机硬件对比功能正在开发中
            </div>
          </div>

          {/* 预留位置2 */}
          <div className="group bg-gray-900/20 backdrop-blur-sm border border-gray-600/30 rounded-2xl p-8 opacity-40">
            <div className="flex items-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center mr-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-600 mb-1">更多功能</h3>
                <h3 className="text-xl font-bold text-gray-600">敬请期待</h3>
              </div>
            </div>
            <div className="text-gray-600 text-sm leading-relaxed">
              更多手机硬件对比功能正在开发中
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 relative z-10">
        <div className="flex justify-center items-center gap-6 mb-4">
          <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-gray-300 text-xs">📱</span>
          </div>
          <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-gray-300 text-xs">📊</span>
          </div>
          <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-gray-300 text-xs">🔧</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          沪ICP备2024064913号
        </div>
      </footer>
    </div>
  );
} 