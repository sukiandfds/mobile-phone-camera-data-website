'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {  Chart as ChartJS,  CategoryScale,  LinearScale,  PointElement,  LineElement,  Title,  Tooltip,  Legend, LogarithmicScale, ScriptableContext, TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LogarithmicScale
);

interface PhoneData {
  name: string;
  releaseDate: string;
  level: string;
  releaseYear: number;
}

interface LensDetail {
  sensor: string;
  sensorSize: string;
  physicalFocalLength: string;
  equivalentFocalLength: string;
  aperture: string;
  equivalentAperture: string;
}

interface LensInfo {
  focalLength: number;
  aperture: number;
  type: string;
  physicalApertureValue?: number;
  conversionFactor?: number;
}

interface ExtendedPointDetails extends LensInfo {
  note: string;
  sourceLensFocalLength?: number;
  sourceLensAperture?: number;
  calculatedEquivalentAperture?: number;
}

interface ChartDataset {
  label: string;
  data: Array<{ x: number; y: number; details: ExtendedPointDetails | LensDetail | null | { note: string, [key: string]: string | number | boolean | LensDetail | ExtendedPointDetails | null }; originalFocalLength: number; pointType?: string } | number | null>;
  borderColor: string;
  backgroundColor: string;
  tension: number;
  brand: string;
  releaseYear: number;
  lensDetails: { [key: string]: LensDetail };
  originalLenses: LensInfo[];
}

interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

interface PhoneBrandData {
  [brand: string]: PhoneData[];
}

const BRAND_NAMES = {
  xiaomi: '小米',
  vivo: 'vivo',
  oppo: 'OPPO',
  apple: '苹果',
  samsung: '三星',
  huawei: '华为',
  honor: '荣耀',
  nubia: '努比亚'
};

const BRAND_COLORS = {
  xiaomi: '#FF6B35',
  vivo: '#8E24AA',
  oppo: '#43A047',
  apple: '#1E88E5',
  samsung: '#E53935',
  huawei: '#F57C00',
  honor: '#7B1FA2',
  nubia: '#D32F2F'
};

// Define major focal lengths (will be populated from chartData.labels)
let MAJOR_FOCAL_LENGTHS: number[] = [];

export default function PhoneCameraComparison() {
  const [phoneData, setPhoneData] = useState<PhoneBrandData>({});
  const [chartData, setChartData] = useState<ChartData>({ labels: [], datasets: [] });
  const [visibleDatasets, setVisibleDatasets] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [loading, setLoading] = useState(true);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const phoneResponse = await fetch('/data/phones-enhanced.json');
        const chartResponse = await fetch('/data/chart-enhanced.json');
        
        if (phoneResponse.ok && chartResponse.ok) {
          const loadedPhoneData: PhoneBrandData = await phoneResponse.json();
          const loadedChartData: ChartData = await chartResponse.json();
          
          // Initialize MAJOR_FOCAL_LENGTHS from chart data labels
          if (loadedChartData.labels && loadedChartData.labels.length > 0) {
            MAJOR_FOCAL_LENGTHS = loadedChartData.labels.map(label => parseInt(label.replace('mm', '')));
          }
          
          // Transform datasets for linear X-axis and native lens points
          const transformedDatasets = loadedChartData.datasets.map(dataset => {
            // Ensure originalLenses is an array and sort it by focal length
            const originalLenses = (dataset.originalLenses || []).slice().sort((a, b) => a.focalLength - b.focalLength);
            
            const newPoints: Array<{ x: number; y: number; details: ExtendedPointDetails | null; originalFocalLength: number; pointType: string }> = [];
            const FOCAL_LENGTH_AT_END = 200; // Define the maximum focal length for extension

            const MAJOR_FOCAL_LENGTHS_NUM = MAJOR_FOCAL_LENGTHS.length > 0 
                ? MAJOR_FOCAL_LENGTHS 
                : (loadedChartData?.labels?.map(l => parseFloat(l.replace('mm', ''))) || []);

            if (originalLenses.length > 0 && MAJOR_FOCAL_LENGTHS_NUM.length > 0) {
              for (let i = 0; i < originalLenses.length; i++) {
                const currentLens = originalLenses[i];
                const nextOriginalLens = (i + 1 < originalLenses.length) ? originalLenses[i + 1] : null;

                if (!currentLens || typeof currentLens.focalLength !== 'number' || typeof currentLens.aperture !== 'number') {
                  console.warn(`Skipping invalid current lens data for ${dataset.label}`, currentLens);
                  continue;
                }

                // 1. Add actual point for currentLens
                newPoints.push({
                  x: currentLens.focalLength,
                  y: currentLens.aperture,
                  details: { note: 'Actual lens data', ...currentLens },
                  originalFocalLength: currentLens.focalLength,
                  pointType: 'actual'
                });

                const extendToFL = nextOriginalLens ? nextOriginalLens.focalLength : FOCAL_LENGTH_AT_END;

                // 2. Add generated connector points between currentLens.focalLength and extendToFL
                MAJOR_FOCAL_LENGTHS_NUM.forEach(majorFL => {
                  if (currentLens.focalLength < majorFL && majorFL < extendToFL) {
                    // Use simplified calculation based on native equivalent aperture and focal length ratio
                    const y_calculated = currentLens.focalLength !== 0 
                                       ? currentLens.aperture * (majorFL / currentLens.focalLength)
                                       : currentLens.aperture; // Avoid division by zero, though focalLength should not be 0
                    newPoints.push({
                      x: majorFL,
                      y: y_calculated,
                      details: { 
                        note: `Generated connector at ${majorFL}mm (based on ${currentLens.focalLength}mm lens optics)`, 
                        sourceLensFocalLength: currentLens.focalLength,
                        sourceLensAperture: currentLens.aperture,
                        calculatedEquivalentAperture: y_calculated,
                        ...currentLens // Include original lens details for context if needed
                      },
                      originalFocalLength: majorFL,
                      pointType: 'generated_connector'
                    });
                  }
                });

                // 3. Add theoretical point at extendToFL (end of current lens's segment)
                if (extendToFL > currentLens.focalLength) {
                  // Use simplified calculation based on native equivalent aperture and focal length ratio
                  const y_theoretical_at_extendToFL = currentLens.focalLength !== 0
                                                    ? currentLens.aperture * (extendToFL / currentLens.focalLength)
                                                    : currentLens.aperture; // Avoid division by zero
                  newPoints.push({
                    x: extendToFL,
                    y: y_theoretical_at_extendToFL,
                    details: { 
                      note: `Theoretical segment end at ${extendToFL}mm (based on ${currentLens.focalLength}mm lens optics)`,
                      sourceLensFocalLength: currentLens.focalLength,
                      sourceLensAperture: currentLens.aperture,
                      calculatedEquivalentAperture: y_theoretical_at_extendToFL,
                      ...currentLens // Include original lens details for context if needed
                    },
                    originalFocalLength: extendToFL,
                    pointType: 'theoretical_segment_end' 
                  });
                }
              }
            }
            
            // Sort all collected points for the dataset by X-coordinate.
            // This is crucial for Chart.js to draw lines correctly, including vertical jumps
            // where two points might share the same X but different Y.
            newPoints.sort((a, b) => {
              if (a.x < b.x) return -1;
              if (a.x > b.x) return 1;
              // If x is the same, maintain a somewhat meaningful order, e.g., actual points could come after theoretical if needed,
              // but for now, simple x sort is the primary goal. Chart.js connects in array order.
              // For vertical lines, the 'theoretical_segment_end' of lens A and 'actual' of lens B (at same X)
              // should result in a line between them.
              return 0; // Or implement secondary sort key if strict ordering for same X is needed
            });
            
            const newDataset: ChartDataset = {
              ...dataset,
              data: newPoints,
              tension: 0, // 强制设置为折线图，覆盖JSON中的曲线设置
            };
            return newDataset;
          });

          setPhoneData(loadedPhoneData);
          setChartData({
            ...loadedChartData,
            datasets: transformedDatasets as ChartDataset[], 
          });
          
          // 默认显示每个品牌最新的3个机型
          const defaultVisible = new Set<string>();
          Object.keys(loadedPhoneData).forEach(brand => {
            const brandData = loadedPhoneData[brand];
            const sortedByDate = brandData
              .filter((phone: PhoneData) => phone.releaseYear)
              .sort((a: PhoneData, b: PhoneData) => b.releaseYear - a.releaseYear)
              .slice(0, 3);
            
            sortedByDate.forEach((phone: PhoneData) => {
              defaultVisible.add(phone.name);
            });
          });
          
          setVisibleDatasets(defaultVisible);
        }
        setLoading(false);
      } catch (error) {
        console.error('加载数据失败:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 过滤数据集
  const filteredDatasets = useMemo(() => {
    // Ensure chartData and datasets are defined before filtering
    if (!chartData || !chartData.datasets) {
      return [];
    }
    const datasets = chartData.datasets as unknown as Array<ChartDataset & { data: Array<{x: number, y: number, details: ExtendedPointDetails | LensDetail | null }> }>; 
    return datasets.filter(dataset => visibleDatasets.has(dataset.label));
  }, [chartData, visibleDatasets]);

  // 动态计算Y轴范围
  const yAxisRange = useMemo(() => {
    if (filteredDatasets.length === 0) return { min: 4, max: 32 }; // Default multiples of 4 range
    
    let minAperture = Infinity;
    let maxAperture = -Infinity;
    
    filteredDatasets.forEach(dataset => {
      dataset.data.forEach(point => {
        if (point && typeof point === 'object' && point.y !== null && point.y !== undefined && 'y' in point) { // Check 'y' in point
          minAperture = Math.min(minAperture, (point as {y:number}).y);
          maxAperture = Math.max(maxAperture, (point as {y:number}).y);
        }
      });
    });
    
    if (minAperture === Infinity || maxAperture === -Infinity) return { min: 4, max: 32 }; // Fallback if no valid data points
    
    let newMinY = Math.floor(minAperture / 4) * 4;
    if (minAperture > 0 && newMinY === 0) { // Ensure if data is positive, min tick is at least 4
      newMinY = 4;
    }
    if (minAperture > 0 && minAperture < newMinY && newMinY > 4) { // If minAperture is e.g. 3.5, newMinY might be 4. If minAperture is 7, newMinY is 4. This ensures it covers.
        newMinY = Math.max(4, newMinY -4); // Should ensure that the smallest tick is <= minAperture or is 4.
    } else if (minAperture > 0 && newMinY === 0) {
        newMinY = 4;
    }
    if (newMinY < 4) newMinY = 4; // Absolute minimum is F4

    // Ensure the smallest tick is less than or equal to minAperture, unless minAperture is below 4.
    if (minAperture >= 4) {
        let candidateMin = Math.floor(minAperture / 4) * 4;
        if (candidateMin > minAperture && candidateMin > 4) candidateMin -=4;
        newMinY = Math.max(4, candidateMin)
    } else {
        newMinY = 4;
    }

    const newMaxY = Math.ceil(maxAperture / 4) * 4;
    
    return {
      min: newMinY,
      max: Math.max(newMinY + 4, newMaxY) // Ensure max is at least one step greater than min if they are too close
    };
  }, [filteredDatasets]);

  // 图表配置 - 仿照新设计
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'point' as const,
      intersect: false,
      axis: 'xy' as const,
    },
    elements: {
      line: {
        tension: 0, // Straight lines
      },
      point: {
        radius: (context: ScriptableContext<'line'>) => {
          const rawData = context.raw as { pointType?: string };
          if (rawData?.pointType === 'actual') {
            return 3; // Visible radius for actual points
          }
          return 0; // Invisible for theoretical/connector points
        },
        hoverRadius: (context: ScriptableContext<'line'>) => {
          const rawData = context.raw as { pointType?: string };
          if (rawData?.pointType === 'actual') {
            return 5; // Larger radius on hover for actual points
          }
          return 0;
        },
        hitRadius: (context: ScriptableContext<'line'>) => {
          const rawData = context.raw as { pointType?: string };
          if (rawData?.pointType === 'actual') {
            return 10; // Larger hit area for actual points
          }
          return 0;
        }
      }
    },
    scales: {
      x: {
        type: 'logarithmic' as const, // Change X-axis to logarithmic
        min: MAJOR_FOCAL_LENGTHS.length > 0 ? Math.min(...MAJOR_FOCAL_LENGTHS) * 0.9 : 10, // Adjust min dynamically
        max: MAJOR_FOCAL_LENGTHS.length > 0 ? Math.max(...MAJOR_FOCAL_LENGTHS) * 1.05 : 220, // Adjust max dynamically
        title: {
            display: true,
            text: '等效焦距 (mm)',
            color: '#999999',
            font: { size: 12 }
        },
        grid: {
          color: '#2a2a2a',
          lineWidth: 1
        },
        ticks: {
          color: '#999999',
          font: {
            size: 11
          },
          autoSkip: false, // Give more control to afterBuildTicks
          callback: function(value: unknown /*, index, ticks */) {
            const tickValue = Number(value);
            // Only show labels for MAJOR_FOCAL_LENGTHS
            if (MAJOR_FOCAL_LENGTHS.includes(tickValue)) {
              return `${tickValue}mm`;
            }
            return ''; // Hide labels for other auto-generated log-scale ticks
          }
        },
        afterBuildTicks: (axis: { ticks: Array<{ value: number }>, min: number, max: number }) => {
          if (MAJOR_FOCAL_LENGTHS.length > 0) {
            // Filter MAJOR_FOCAL_LENGTHS to be within the axis min/max and create ticks
            axis.ticks = MAJOR_FOCAL_LENGTHS
              .filter(fl => fl >= axis.min && fl <= axis.max)
              .map(fl => ({ value: fl }))
              .sort((a,b) => a.value - b.value); // Ensure sorted for log axis
          } else {
            axis.ticks = [];
          }
        },
        border: {
          color: '#444444'
        }
      },
      y: {
        reverse: true, 
        type: 'linear' as const, // Change to linear scale
        title: {
            display: true,
            text: '等效光圈 (F)',
            color: '#999999',
            font: { size: 12 }
        },
        min: yAxisRange.min,
        max: yAxisRange.max,
        ticks: {
          color: '#999999',
          font: {
            size: 11
          },
          callback: function(value: unknown /*, index: number, ticks: Chart.Tick[] */) {
            const tickValue = Number(value);
            // All ticks will be multiples of 4 from afterBuildTicks
            return `F${tickValue.toFixed(0)}`;
          },
          autoSkip: false, 
          stepSize: undefined, // Let afterBuildTicks handle step logic
        },
        afterBuildTicks: (axis: { min: number; max: number; ticks: { value: number }[] }) => {
          const newTicks: { value: number }[] = [];
          const yMin = axis.min; // This is the calculated min (e.g., 4, 8)
          const yMax = axis.max; // This is the calculated max (e.g., 28, 32)

          for (let v = yMin; v <= yMax; v += 4) {
            if (v >= 4) { // Ensure ticks start from F4 or greater
              newTicks.push({ value: v });
            }
          }
          
          if (newTicks.length === 0 && yMin >=4 && yMax >= yMin) { // Handle edge case where range is too small e.g. min=4, max=7
             newTicks.push({value: yMin});
             if (yMax >= yMin + 4) newTicks.push({value: Math.ceil(yMax/4)*4 }) // add max if it's a step away
          }
          
          axis.ticks = newTicks;
          
          // Ensure ticks are sorted correctly because y-axis is reversed.
          // The actual scale rendering will handle the reverse order.
          axis.ticks.sort((a: {value:number}, b: {value:number}) => a.value - b.value); 
        },
        grid: {
          color: '#2a2a2a',
          lineWidth: 1
        },
        border: {
          color: '#444444'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: true,
        callbacks: {
          title: function(tooltipItems: TooltipItem<'line'>[]) {
            // 只显示实际点位的机型名称
            const actualItems = tooltipItems.filter(item => (item.raw as { pointType?: string })?.pointType === 'actual');
            if (actualItems.length > 0) {
              if (actualItems.length === 1) {
                return actualItems[0].dataset.label || '';
              } 
              // If multiple actual points are hovered (e.g., two lines intersect exactly there)
              return actualItems.map(item => item.dataset.label || '').join(', ');
            }
            // For non-actual points, try to find context from the raw data if available
            if (tooltipItems.length > 0) {
              const rawData = tooltipItems[0].raw as { 
                pointType?: string, 
                details?: ExtendedPointDetails | LensDetail | null | ({ note: string } & (LensInfo | ExtendedPointDetails)), 
                originalFocalLength?: number 
              }; 
              if (rawData && rawData.details && typeof rawData.details === 'object' && 'note' in rawData.details) {
                return rawData.details.note;
              }
            }
            
            return '';
          },
          label: function(context: TooltipItem<'line'>) {
            const rawData = context.raw as { 
              pointType?: string, 
              details?: ExtendedPointDetails | LensDetail | null | ({ note: string } & (LensInfo | ExtendedPointDetails)), 
              originalFocalLength?: number 
            }; 
            const pointType = rawData?.pointType;

            if (pointType !== 'actual') {
                if (rawData?.details && 'note' in rawData.details && typeof (rawData.details as { note: string }).note === 'string') return `Y: ${context.parsed.y.toFixed(1)}`;
                return '';
            }

            const details = rawData?.details as ({ note: string } & (LensInfo | ExtendedPointDetails)); // More specific type for details when actual
            if (!details) return '';

            const label = [];
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const allTooltipItems = (context.chart as any).tooltip.dataPoints || [context]; // context.chart.tooltip may not exist, keep as any for now or find specific type
            const actualItemsFromChart = allTooltipItems.filter((item: TooltipItem<'line'>) => (item.raw as { pointType?: string })?.pointType === 'actual');
            if (actualItemsFromChart.length > 1) {
              label.push(` ${context.dataset.label}`);
            }
            
            const dataset = context.dataset as ChartDataset; 
            const focalLengthToLookup = rawData?.originalFocalLength || details?.focalLength;
            const lensDetail = focalLengthToLookup ? dataset.lensDetails?.[focalLengthToLookup.toString()] : undefined;
            
            if (lensDetail?.sensor) {
              label.push(`传感器: ${lensDetail.sensor}`);
            }
            
            if (lensDetail?.sensorSize) {
              label.push(`传感器尺寸: ${lensDetail.sensorSize}`);
            }
            
            const equivalentFocalLength = rawData?.originalFocalLength || details?.focalLength;
            if (equivalentFocalLength) {
              label.push(`等效焦距: ${equivalentFocalLength}mm`);
            }
            
            if (details?.physicalApertureValue) {
              label.push(`镜头光圈: f/${details.physicalApertureValue}`);
            }
            
            label.push(`等效光圈: F${context.parsed.y.toFixed(1)}`);

            return label;
          },
          afterLabel: function() {
            return '';
          }
        }
      }
    }
  };

  // Toggle dataset visibility
  const toggleDataset = (phoneLabel: string) => {
    const newVisible = new Set(visibleDatasets);
    if (newVisible.has(phoneLabel)) {
      newVisible.delete(phoneLabel);
    } else {
      newVisible.add(phoneLabel);
    }
    setVisibleDatasets(newVisible);
  };

  // 全部隐藏
  const hideAll = () => {
    setVisibleDatasets(new Set());
  };

  // 显示筛选结果 - 改为显示全部
  const showAll = () => {
    const allPhoneLabels = new Set<string>();
    chartData.datasets.forEach(dataset => allPhoneLabels.add(dataset.label));
    setVisibleDatasets(allPhoneLabels);
  };

  // 获取所有可用年份
  const getAvailableYears = () => {
    const years = new Set<number>();
    Object.values(phoneData).flat().forEach(phone => {
      if (phone.releaseYear) {
        years.add(phone.releaseYear);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  // 获取所有可用品牌
  const getAvailableBrands = () => {
    return Object.keys(phoneData).filter(brand => phoneData[brand].length > 0);
  };

  // 切换年份选择
  const toggleYear = (year: number) => {
    const newYears = new Set(selectedYears);
    if (newYears.has(year)) {
      newYears.delete(year);
    } else {
      newYears.add(year);
    }
    setSelectedYears(newYears);
  };

  // 切换品牌选择
  const toggleBrand = (brand: string) => {
    const newBrands = new Set(selectedBrands);
    if (newBrands.has(brand)) {
      newBrands.delete(brand);
    } else {
      newBrands.add(brand);
    }
    setSelectedBrands(newBrands);
  };

  // 应用筛选
  const applyFilters = () => {
    const filteredPhoneLabels = new Set<string>();
    
    chartData.datasets.forEach(dataset => {
      const phone = Object.values(phoneData).flat().find(p => p.name === dataset.label);
      if (phone) {
        const yearMatch = selectedYears.size === 0 || selectedYears.has(phone.releaseYear);
        const brandMatch = selectedBrands.size === 0 || selectedBrands.has(dataset.brand);
        
        if (yearMatch && brandMatch) {
          filteredPhoneLabels.add(dataset.label);
        }
      }
    });
    
    setVisibleDatasets(filteredPhoneLabels);
    setShowFilters(false);
  };

  // 清除筛选
  const clearFilters = () => {
    setSelectedYears(new Set());
    setSelectedBrands(new Set());
  };

  // 切换品牌展开状态
  const toggleBrandExpansion = (brand: string) => {
    const newExpanded = new Set(expandedBrands);
    if (newExpanded.has(brand)) {
      newExpanded.delete(brand);
    } else {
      newExpanded.add(brand);
    }
    setExpandedBrands(newExpanded);
  };

  // 获取品牌的机型列表
  const getBrandPhones = (brand: string) => {
    const brandPhones = phoneData[brand] || [];
    const sortedPhones = brandPhones
      .filter(phone => phone.releaseYear) // Ensure releaseYear exists for sorting
      .sort((a, b) => b.releaseYear - a.releaseYear); // Sort by release year, newest first
    
    // 如果品牌未展开，只显示前4个
    if (!expandedBrands.has(brand)) {
      return sortedPhones.slice(0, 4);
    }
    
    return sortedPhones;
  };

  // 计算特定焦距的等效光圈
  const calculateApertureAtFocalLength = useCallback((targetFocal: number, phoneLenses: LensInfo[]): number | null => {
    if (!phoneLenses || phoneLenses.length === 0) return null;

    // 边界规则：不向更广角模拟
    const minFocalInLenses = Math.min(...phoneLenses.map(l => l.focalLength));
    if (targetFocal < minFocalInLenses) return null;

    // 如果有精确匹配的原生焦段，直接返回
    const exactMatch = phoneLenses.find(l => l.focalLength === targetFocal);
    if (exactMatch && typeof exactMatch.aperture === 'number') return exactMatch.aperture;

    // 找到最合适的镜头进行计算: 小于或等于目标焦距的最近的那个原生镜头
    let bestLens: LensInfo | null = null;
    const suitableLenses = phoneLenses.filter(l => l.focalLength <= targetFocal && typeof l.aperture === 'number');

    if (suitableLenses.length > 0) {
      bestLens = suitableLenses.reduce((prev, current) => (prev.focalLength > current.focalLength) ? prev : current);
    } else {
      // 如果没有小于等于目标焦距的镜头 (例如 targetFocal 大于所有镜头焦距)
      // 则使用焦距最大的那个原生镜头作为计算基准
      if (phoneLenses.length > 0) {
        const maxFocalLens = phoneLenses.reduce((prev: LensInfo, current: LensInfo) => 
            (prev.focalLength > current.focalLength) ? prev : current
        );
        if (maxFocalLens && typeof maxFocalLens.aperture === 'number') {
            bestLens = maxFocalLens;
        }
      }
    }

    if (!bestLens || typeof bestLens.aperture !== 'number') {
        console.warn(`[calculateApertureAtFocalLength] No suitable bestLens found for ${targetFocal}mm or its aperture is invalid. Lenses available:`, phoneLenses);
        return null; 
    }
    
    // 使用简化的计算逻辑：A_target = A_native * (F_target / F_native)
    if (bestLens.focalLength === 0) {
        // If bestLens focal length is 0, and targetFocal is also 0, return aperture. Otherwise, it's an invalid scenario for ratio calculation.
        return targetFocal === 0 ? bestLens.aperture : null;
    }

    const calculatedAperture = bestLens.aperture * (targetFocal / bestLens.focalLength);
    return Number(calculatedAperture.toFixed(1));

  }, []);

  // 获取所有焦段（标准焦段 + 原生焦段）
  const getAllFocalLengths = useMemo(() => {
    const standardFocals = MAJOR_FOCAL_LENGTHS; 
    const nativeFocals = new Set<number>();

    // 只从当前选中的机型中收集原生焦段
    filteredDatasets.forEach(dataset => { // Iterate over filteredDatasets
      if (dataset.originalLenses) {
        dataset.originalLenses.forEach(lens => {
          nativeFocals.add(lens.focalLength);
        });
      }
    });

    // 合并并去重，然后排序
    const allFocals = [...new Set([...standardFocals, ...Array.from(nativeFocals)])];
    return allFocals.sort((a, b) => a - b);
  }, [filteredDatasets, MAJOR_FOCAL_LENGTHS]); // Added filteredDatasets and MAJOR_FOCAL_LENGTHS to dependencies

  // 生成表格数据
  const generateTableData = useCallback(() => {
    const tableDataGenerated: { [phone: string]: { [focal: string]: number | null } } = {};
    
    filteredDatasets.forEach(dataset => {
      const phoneName = dataset.label;
      tableDataGenerated[phoneName] = {};
      
      const lenses = dataset.originalLenses || [];
      
      getAllFocalLengths.forEach(focal => {
        const aperture = calculateApertureAtFocalLength(focal, lenses);
        tableDataGenerated[phoneName][`${focal}mm`] = aperture;
      });
    });
    
    return tableDataGenerated;
  }, [filteredDatasets, getAllFocalLengths, calculateApertureAtFocalLength]); // Added dependencies

  const tableData = useMemo(() => generateTableData(), [generateTableData]); // Updated dependencies

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  const chartDataForRender = {
    // labels: chartData.labels, // For linear X-axis, labels array is not directly used by Line component this way for x-points
    // Instead, data points {x,y} define their own x positions.
    // However, chartData.labels IS used for x.afterBuildTicks above.
    datasets: filteredDatasets
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 -z-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.1) 35px, rgba(255,255,255,0.1) 70px)`,
        }}></div>
      </div>
      {/* Top Navigation / Header Area */}
      <header className="relative z-20">
        <div className="container mx-auto px-4 py-6">
          {/* Back Button */}
          <div className="absolute left-4 top-6">
            <Link 
              href="/"
              className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors flex items-center justify-center"
              aria-label="返回"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </Link>
          </div>

          {/* Center: Titles */}
          <div className="text-center px-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">手机后置摄像头 - 等效光圈</h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">部分手机的后置摄像头的等效光圈</p>
          </div>

          {/* View Mode Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors border ${
                viewMode === 'chart'
                  ? 'bg-cyan-500 text-white border-cyan-500'
                  : 'bg-transparent text-cyan-400 border-cyan-400 hover:bg-cyan-500/10'
              }`}
            >
              查看曲线
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors border ${
                viewMode === 'table'
                  ? 'bg-cyan-500 text-white border-cyan-500'
                  : 'bg-transparent text-cyan-400 border-cyan-400 hover:bg-cyan-500/10'
              }`}
            >
              查看表格
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 py-6 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-xl">加载中...</div>
          </div>
        ) : (
          <>
            {/* Chart Area / Table Area */}
            <section className="mb-8 animate-fade-in">
              {viewMode === 'chart' ? (
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 animate-scale-in">
                  <div className="h-[60vh] sm:h-[65vh] md:h-[70vh]">
                    {MAJOR_FOCAL_LENGTHS.length > 0 ? ( // Ensure MAJOR_FOCAL_LENGTHS is populated
                      <Line data={chartDataForRender} options={chartOptions} />
                    ) : (
                      <div className="text-white text-center flex items-center justify-center h-full">
                        <div className="text-lg">图表数据仍在加载或初始化...</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // 等效光圈数据表格
                <div className="bg-gray-900 rounded-lg p-4 sm:p-6 animate-scale-in">
                  <h3 className="text-xl font-semibold mb-4 text-white">等效光圈数据表格</h3>
                  {Object.keys(tableData).length > 0 ? (
                    <div className="relative">
                      {/* 滚动提示 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-400">
                          <span className="hidden sm:inline">横向滚动查看更多数据</span>
                          <span className="sm:hidden">左右滑动查看更多</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          共 {getAllFocalLengths.length} 个焦段
                        </div>
                      </div>
                      
                      {/* 表格容器 */}
                      <div className="overflow-x-auto scrollbar-custom touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <table className="w-full text-sm text-white border-collapse min-w-max">
                          <thead>
                            <tr>
                              <th className="sticky left-0 bg-gray-800 border border-gray-600 px-3 py-2 text-left font-medium z-20 shadow-lg min-w-[150px]">
                                机型
                              </th>
                              {getAllFocalLengths.map(focal => (
                                <th key={focal} className="border border-gray-600 px-3 py-2 text-center font-medium min-w-[80px] whitespace-nowrap">
                                  {focal}mm
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(tableData).map(([phoneName, phoneData]) => {
                              // 获取该手机的品牌和颜色
                              const dataset = chartData.datasets.find(d => d.label === phoneName);
                              const brandColor = dataset?.borderColor || '#ffffff';
                              
                              return (
                                <tr key={phoneName} className="hover:bg-gray-800/50">
                                  <td 
                                    className="sticky left-0 bg-gray-800 border border-gray-600 px-3 py-2 font-medium z-10 shadow-lg min-w-[150px]"
                                    style={{ color: brandColor }}
                                  >
                                    <div className="truncate" title={phoneName}>
                                      {phoneName}
                                    </div>
                                  </td>
                                  {getAllFocalLengths.map(focal => {
                                    const focalKey = `${focal}mm`;
                                    const aperture = phoneData[focalKey];
                                    const isNative = dataset?.originalLenses?.some(l => l.focalLength === focal);
                                    
                                    return (
                                      <td key={focal} className="border border-gray-600 px-3 py-2 text-center min-w-[80px] whitespace-nowrap">
                                        {aperture !== null ? (
                                          <span 
                                            className={isNative ? 'font-bold' : 'opacity-75'}
                                            title={isNative ? '原生焦段' : '计算值'}
                                          >
                                            F{aperture}
                                          </span>
                                        ) : (
                                          <span className="text-gray-500">-</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-4 text-xs text-gray-400">
                        <p>• <strong>粗体</strong>：原生镜头焦段的实际等效光圈值</p>
                        <p>• 普通字体：基于物理参数计算的理论等效光圈值</p>
                        <p>• &quot;-&quot;：无法计算（目标焦段比该机型最广角镜头更广）</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400">没有可显示的数据，请选择至少一个机型。</p>
                  )}
                </div>
              )}
            </section>

            {/* Chart Control Buttons */}
            <section className="mb-8 text-center relative z-10 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={hideAll}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border focus:outline-none focus:ring-2 cursor-pointer transform hover:scale-105 ${
                      visibleDatasets.size === 0
                        ? 'bg-cyan-600 text-white border-cyan-600 focus:ring-cyan-500'
                        : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600 focus:ring-gray-500'
                    }`}
                  >
                    全部隐藏
                  </button>
                  <button
                    type="button"
                    onClick={showAll} 
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border focus:outline-none focus:ring-2 cursor-pointer transform hover:scale-105 ${
                      visibleDatasets.size === chartData.datasets.length && chartData.datasets.length > 0
                        ? 'bg-cyan-600 text-white border-cyan-600 focus:ring-cyan-500'
                        : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600 focus:ring-gray-500'
                    }`}
                  >
                    全部显示
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer transform hover:scale-105 ${
                      showFilters || selectedYears.size > 0 || selectedBrands.size > 0
                        ? 'bg-cyan-600 text-white border-cyan-600' 
                        : 'bg-gray-800 hover:bg-gray-700 text-white border-gray-600'
                    }`}
                  >
                    筛选
                    {(selectedYears.size > 0 || selectedBrands.size > 0) && (
                      <span className="ml-1 bg-white text-cyan-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
                        {selectedYears.size + selectedBrands.size}
                      </span>
                    )}
                  </button>
                  {(selectedYears.size > 0 || selectedBrands.size > 0) && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer transform hover:scale-105 animate-scale-in"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>

              {/* 筛选面板 */}
              {showFilters && (
                <div className="mt-6 bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700 max-w-4xl mx-auto animate-slide-down">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 年份筛选 */}
                    <div>
                      <h4 className="text-lg font-medium text-white mb-3">发布年份</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {getAvailableYears().map(year => (
                          <button
                            key={year}
                            type="button"
                            onClick={() => toggleYear(year)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border transform hover:scale-105 ${
                              selectedYears.has(year)
                                ? 'bg-cyan-600 text-white border-cyan-600 shadow-lg'
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
                            }`}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 品牌筛选 */}
                    <div>
                      <h4 className="text-lg font-medium text-white mb-3">品牌</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {getAvailableBrands().map(brand => (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => toggleBrand(brand)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border transform hover:scale-105 ${
                              selectedBrands.has(brand)
                                ? 'bg-cyan-600 text-white border-cyan-600 shadow-lg'
                                : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
                            }`}
                          >
                            {BRAND_NAMES[brand as keyof typeof BRAND_NAMES] || brand}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 应用按钮 */}
                  <div className="flex justify-center gap-4 mt-6">
                    <button
                      type="button"
                      onClick={applyFilters}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 transform hover:scale-105"
                    >
                      应用筛选
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transform hover:scale-105"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Phone Selection Area (Pills) */}
            <section>
              {Object.keys(phoneData).map(brand => {
                const brandPhones = getBrandPhones(brand); // This function needs to be adapted or replaced
                if (brandPhones.length === 0) return null;

                const allBrandPhones = phoneData[brand] || [];
                const sortedAllPhones = allBrandPhones
                  .filter(phone => phone.releaseYear)
                  .sort((a, b) => b.releaseYear - a.releaseYear);
                const hasMorePhones = sortedAllPhones.length > 4;
                const isExpanded = expandedBrands.has(brand);

                return (
                  <div key={brand} className="mb-8 animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-white">
                        {BRAND_NAMES[brand as keyof typeof BRAND_NAMES] || brand}
                      </h3>
                      {hasMorePhones && (
                        <button
                          onClick={() => toggleBrandExpansion(brand)}
                          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-all duration-200 flex items-center gap-1 transform hover:scale-105"
                        >
                          {isExpanded ? '收起' : `展开更多 (${sortedAllPhones.length - 4})`}
                          <svg 
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {brandPhones.map(phone => {
                        const isVisible = visibleDatasets.has(phone.name);
                        // Calculate focal range from originalLenses
                        let focalRange = "N/A";
                        const datasetForPhone = chartData.datasets.find(d => d.label === phone.name);
                        if (datasetForPhone && datasetForPhone.originalLenses && datasetForPhone.originalLenses.length > 0) {
                          const focalLengths = datasetForPhone.originalLenses.map(l => l.focalLength).sort((a,b) => a-b);
                          if (focalLengths.length > 0) {
                            focalRange = focalLengths.length === 1 
                              ? `${focalLengths[0]}mm` 
                              : `${focalLengths[0]}mm - ${focalLengths[focalLengths.length - 1]}mm`;
                          }
                        }
                        
                        // Format release date
                        const releaseDisplayDate = phone.releaseDate || "未知日期";
                        // Potentially format date string in future if it's more complex

                        return (
                          <button
                            key={phone.name}
                            onClick={() => toggleDataset(phone.name)}
                            className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50 shadow-lg hover:shadow-xl border animate-scale-in
                              ${isVisible 
                                ? 'text-white shadow-lg' // Specific brand color is applied via style
                                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 border-gray-600 hover:border-gray-500' // Unselected state
                              }`}
                            style={{
                              backgroundColor: isVisible 
                                ? (BRAND_COLORS[brand as keyof typeof BRAND_COLORS] || '#4A5568') // fallback color if brand color is missing
                                : undefined,
                              borderColor: isVisible 
                                ? (BRAND_COLORS[brand as keyof typeof BRAND_COLORS] || '#4A5568') 
                                : undefined,
                            }}
                          >
                            <div className="font-semibold truncate">{phone.name}</div>
                            <div className="text-xs opacity-90 mt-0.5 truncate">{releaseDisplayDate} | {focalRange}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </main>
    </div>
  );
} 