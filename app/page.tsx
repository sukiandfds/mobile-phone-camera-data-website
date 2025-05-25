'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {  Chart as ChartJS,  CategoryScale,  LinearScale,  PointElement,  LineElement,  Title,  Tooltip,  Legend, LogarithmicScale} from 'chart.js';
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
}

interface ChartDataset {
  label: string;
  data: Array<{ x: number; y: number; details: LensDetail | null | { note: string, [key: string]: any }; originalFocalLength: number; pointType?: string } | number | null>;
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

const APERTURE_SCALE = [4.0, 5.6, 8.0, 11, 16, 22, 32, 45, 64];

// Define major focal lengths (will be populated from chartData.labels)
let MAJOR_FOCAL_LENGTHS: number[] = [];

// Helper function to transform focal length to new X-coordinate
function transformFocalLengthToXCoordinate(
  focalLength: number,
  majorFocalLengths: number[]
): number {
  if (majorFocalLengths.length === 0) return focalLength;

  // Find the index of the first major tick that is greater than or equal to the focal length
  const insertIndex = majorFocalLengths.findIndex(tick => tick >= focalLength);

  if (insertIndex === -1) {
    // Focal length is greater than all major ticks, place it after the last tick proportionally
    // This case should ideally be handled by the 200mm extension logic for the last lens.
    // For intermediate lenses that might go beyond the last standard tick before 200mm,
    // we might need a more robust way if MAJOR_FOCAL_LENGTHS doesn't include 200mm explicitly as the true end.
    // Assuming 200mm is the conceptual end for now.
    if (majorFocalLengths.length > 0) {
        const lastTickVal = majorFocalLengths[majorFocalLengths.length - 1];
        const secondLastTickVal = majorFocalLengths.length > 1 ? majorFocalLengths[majorFocalLengths.length - 2] : 0;
        const lastSegmentLength = lastTickVal - secondLastTickVal;
        if (lastSegmentLength > 0) {
             return (majorFocalLengths.length - 1) + (focalLength - lastTickVal) / lastSegmentLength;
        }
        return majorFocalLengths.length -1; // Fallback
    }
     return majorFocalLengths.length > 0 ? majorFocalLengths.length -1 : 0; // Default to last tick if all else fails
  }

  if (insertIndex === 0) {
    // Focal length is less than or equal to the first major tick.
    if (focalLength === majorFocalLengths[0]) return 0; // Exactly on the first tick

    // Proportionally place before the first tick, assuming a conceptual "0" or previous tick.
    // This assumes the "space" before the first tick is similar to the first segment.
    const firstSegmentLength = majorFocalLengths.length > 1 ? majorFocalLengths[1] - majorFocalLengths[0] : majorFocalLengths[0];
    if (firstSegmentLength > 0) {
        return (focalLength - majorFocalLengths[0]) / firstSegmentLength; // Will be negative or zero
    }
    return 0; // Fallback
  }

  // Focal length is between majorFocalLengths[insertIndex-1] and majorFocalLengths[insertIndex]
  const prevTick = majorFocalLengths[insertIndex - 1];
  const nextTick = majorFocalLengths[insertIndex];
  const segmentLength = nextTick - prevTick;

  if (segmentLength === 0) return insertIndex - 1; // Should not happen with distinct ticks

  const proportion = (focalLength - prevTick) / segmentLength;
  return (insertIndex - 1) + proportion;
}

const X_AXIS_PADDING = 1.0;

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
            const originalLenses = dataset.originalLenses || [];
            const newPoints: Array<{ x: number; y: number; details: any; originalFocalLength: number; pointType: string }> = [];
            
            const MAJOR_FOCAL_LENGTHS_NUM = MAJOR_FOCAL_LENGTHS.length > 0 
                ? MAJOR_FOCAL_LENGTHS 
                : (loadedChartData?.labels?.map(l => parseFloat(l.replace('mm', ''))) || []);

            if (originalLenses && originalLenses.length > 0 && MAJOR_FOCAL_LENGTHS_NUM.length > 0) {
              for (let i = 0; i < originalLenses.length; i++) {
                const currentLens = originalLenses[i];

                if (!currentLens || typeof currentLens.focalLength !== 'number' || typeof currentLens.aperture !== 'number') {
                  console.warn(`Skipping invalid lens data for ${dataset.label}`, currentLens);
                  continue;
                }
                
                // 1. Add current lens's actual data point
                newPoints.push({
                  x: transformFocalLengthToXCoordinate(currentLens.focalLength, MAJOR_FOCAL_LENGTHS_NUM),
                  y: currentLens.aperture,
                  details: currentLens,
                  originalFocalLength: currentLens.focalLength,
                  pointType: 'actual'
                });

                if (i < originalLenses.length - 1) { // If not the last lens
                  const nextLens = originalLenses[i + 1];
                  if (!nextLens || typeof nextLens.focalLength !== 'number' || typeof nextLens.aperture !== 'number') {
                    console.warn(`Skipping invalid next lens data for ${dataset.label}`, nextLens);
                    continue;
                  }

                  // 2. Add theoretical end point T_i
                  let y_theoretical_end_i = currentLens.aperture; // Default
                  if (typeof (currentLens as any).physicalApertureValue === 'number' &&
                      typeof (currentLens as any).conversionFactor === 'number' &&
                      currentLens.focalLength !== 0) {
                    y_theoretical_end_i = ((currentLens as any).physicalApertureValue * (currentLens as any).conversionFactor / currentLens.focalLength) * nextLens.focalLength;
                  }
                  newPoints.push({
                    x: transformFocalLengthToXCoordinate(nextLens.focalLength, MAJOR_FOCAL_LENGTHS_NUM),
                    y: y_theoretical_end_i,
                    details: { ...currentLens, note: `Theoretical projection to ${nextLens.focalLength}mm based on ${currentLens.focalLength}mm lens (${dataset.label})` },
                    originalFocalLength: nextLens.focalLength,
                    pointType: 'theoretical_end'
                  });

                  // 3. Add next lens's actual Y-value point for vertical line
                  newPoints.push({
                    x: transformFocalLengthToXCoordinate(nextLens.focalLength, MAJOR_FOCAL_LENGTHS_NUM),
                    y: nextLens.aperture,
                    details: nextLens,
                    originalFocalLength: nextLens.focalLength,
                    pointType: 'actual_for_vertical_line'
                  });

                } else { // If it IS the last lens
                  const FOCAL_LENGTH_AT_END = 200;
                  let y_at_200mm = currentLens.aperture; // Default
                  if (typeof (currentLens as any).physicalApertureValue === 'number' &&
                      typeof (currentLens as any).conversionFactor === 'number' &&
                      currentLens.focalLength !== 0) {
                    y_at_200mm = ((currentLens as any).physicalApertureValue * (currentLens as any).conversionFactor / currentLens.focalLength) * FOCAL_LENGTH_AT_END;
                  }
                  newPoints.push({
                    x: transformFocalLengthToXCoordinate(FOCAL_LENGTH_AT_END, MAJOR_FOCAL_LENGTHS_NUM),
                    y: y_at_200mm,
                    details: { ...currentLens, note: `Theoretical projection to ${FOCAL_LENGTH_AT_END}mm (${dataset.label})` },
                    originalFocalLength: FOCAL_LENGTH_AT_END,
                    pointType: 'theoretical_extension_to_200mm'
                  });
                }
              }
            }
            newPoints.forEach(point => {
              if (!point.details) {
                console.warn(`Invalid point details for ${dataset.label}`, point);
              }
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
    const datasets = chartData.datasets as unknown as Array<ChartDataset & { data: Array<{x: number, y: number, details: LensDetail | null }> }>; // More specific type
    return datasets.filter(dataset => visibleDatasets.has(dataset.label));
  }, [chartData, visibleDatasets]);

  // 动态计算Y轴范围
  const yAxisRange = useMemo(() => {
    if (filteredDatasets.length === 0) return { min: APERTURE_SCALE[0], max: APERTURE_SCALE[APERTURE_SCALE.length - 1] };
    
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
    
    if (minAperture === Infinity) return { min: APERTURE_SCALE[0], max: APERTURE_SCALE[APERTURE_SCALE.length - 1] };
    
    let minIndex = APERTURE_SCALE.findIndex(val => val >= minAperture);
    let maxIndex = APERTURE_SCALE.findIndex(val => val >= maxAperture);

    // Ensure we have a bit of padding, but stay within the APERTURE_SCALE bounds
    minIndex = Math.max(0, minIndex - 1);
    maxIndex = Math.min(APERTURE_SCALE.length - 1, maxIndex + 1);
    
    // Handle cases where all data is outside the default scale or very close to an edge
    if (minIndex > maxIndex) { // Should not happen if data is valid
        return { min: APERTURE_SCALE[0], max: APERTURE_SCALE[APERTURE_SCALE.length - 1] };
    }

    return {
      min: APERTURE_SCALE[minIndex],
      max: APERTURE_SCALE[maxIndex]
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
        radius: (context: any) => {
          const pointType = context.raw?.pointType;
          if (pointType === 'actual') {
            return 3; // Visible radius for actual points
          }
          return 0; // Invisible for theoretical/connector points
        },
        hoverRadius: (context: any) => {
          const pointType = context.raw?.pointType;
          if (pointType === 'actual') {
            return 5; // Larger radius on hover for actual points
          }
          return 0;
        },
        hitRadius: (context: any) => {
          const pointType = context.raw?.pointType;
          if (pointType === 'actual') {
            return 10; // Larger hit area for actual points
          }
          return 0;
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const, // Change X-axis to linear
        min: 0 - X_AXIS_PADDING, // Start before the first tick index
        max: MAJOR_FOCAL_LENGTHS.length > 0 ? (MAJOR_FOCAL_LENGTHS.length - 1) + X_AXIS_PADDING : 10 + X_AXIS_PADDING, // End after the last tick index
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
          stepSize: 1, // Ensure ticks at every integer index
          autoSkip: false, // Attempt to show all labels
          callback: function(value: unknown /*, index, ticks */) {
            // 'value' here is the numeric tick value (0, 1, 2, ...)
            const tickIndex = Number(value);
            if (tickIndex >= 0 && tickIndex < MAJOR_FOCAL_LENGTHS.length && Number.isInteger(tickIndex)) {
              return `${MAJOR_FOCAL_LENGTHS[tickIndex]}mm`;
            }
            return ''; // Don't show labels for non-integer/out-of-bounds ticks
          }
        },
        afterBuildTicks: (axis: { ticks: Array<{ value: number }>, min: number, max: number }) => {
          if (MAJOR_FOCAL_LENGTHS.length > 0) {
            axis.ticks = MAJOR_FOCAL_LENGTHS.map((_, index) => ({ value: index }));
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
        type: 'logarithmic' as const, // Change to logarithmic scale and ensure type is const
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
            // 'this' refers to the scale object, value is the tick value
            // We want to show the F-numbers from APERTURE_SCALE directly
            const tickValue = Number(value);
            if (APERTURE_SCALE.includes(tickValue)) {
              // Correctly format F-number, show one decimal for .6, zero for others like F4, F8, F16
              const sStr = tickValue.toString();
              const hasDecimal = sStr.includes('.');
              // Check if it's a value like F5.6 (common in aperture scales)
              const isStandardDecimalAperture = hasDecimal && sStr.split('.')[1].length === 1;

              if (isStandardDecimalAperture) {
                return `F${tickValue.toFixed(1)}`;
              }
              return `F${tickValue.toFixed(0)}`;
            }
            // Fallback for any other Chart.js generated ticks (should be minimized by afterBuildTicks)
            return `F${tickValue.toFixed(1)}`; 
          },
          autoSkip: false, 
          stepSize: undefined, 
        },
        afterBuildTicks: (axis: { min: number; max: number; ticks: { value: number }[] }) => {
          // Filter ticks to only include those from APERTURE_SCALE that are within the min/max range
          const newTicks = APERTURE_SCALE.filter(
            tickValue => tickValue >= axis.min && tickValue <= axis.max
          );

          // If no APERTURE_SCALE ticks are in range (e.g. data is all F70), 
          // Chart.js might have auto-generated some. We prefer to show nothing or just min/max.
          // For simplicity, if newTicks is empty, let Chart.js do its default or add min/max if sensible.
          // However, with reverse scale, this needs care. For now, let's ensure APERTURE_SCALE priority.
          if (newTicks.length > 0) {
             axis.ticks = newTicks.map(tickValue => ({ value: tickValue }));
          } else {
            // Potentially add just min and max from yAxisRange if no standard F-stops are included
            // This case should be rare if yAxisRange is derived from APERTURE_SCALE
            axis.ticks = []; // Or handle as per desired behavior for empty intersection
          }
          
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
          title: function(tooltipItems: any[]) {
            // 只显示实际点位的机型名称
            const actualItems = tooltipItems.filter(item => item.raw?.pointType === 'actual');
            if (actualItems.length > 0) {
              if (actualItems.length === 1) {
                return actualItems[0].dataset.label || '';
              } 
            }
            
            // 如果没有实际点位，检查理论点
            const theoreticalItems = tooltipItems.filter(item => item.raw?.details?.note);
            if (theoreticalItems.length > 0) {
              return theoreticalItems[0].raw.details.note;
            }
            
            return '';
          },
          label: function(context: any) {
            const pointType = context.raw?.pointType;
            if (pointType !== 'actual') {
                 // For non-actual points, if there's a note in title, label can be simple or empty
                if (context.raw?.details?.note) return `Y: ${context.parsed.y.toFixed(1)}`;
                return ''; // No detailed label for non-actual points unless specified
            }

            const details = context.raw?.details as any;
            if (!details) return '';

            const label = [];
            
            // 如果有多个重叠点，添加机型标识
            const allTooltipItems = context.chart.tooltip.dataPoints || [context];
            const actualItems = allTooltipItems.filter((item: any) => item.raw?.pointType === 'actual');
            if (actualItems.length > 1) {
              label.push(` ${context.dataset.label}`);
            }
            
            // 获取传感器信息 - 从dataset的lensDetails中获取
            const dataset = context.dataset;
            const focalLength = details.originalFocalLength || details.focalLength;
            const lensDetail = dataset.lensDetails?.[focalLength.toString()];
            
            // 1. 传感器名称
            if (lensDetail?.sensor) {
              label.push(`传感器: ${lensDetail.sensor}`);
            }
            
            // 2. 传感器尺寸
            if (lensDetail?.sensorSize) {
              label.push(`传感器尺寸: ${lensDetail.sensorSize}`);
            }
            
            // 3. 等效焦距
            const equivalentFocalLength = details.originalFocalLength || details.focalLength;
            if (equivalentFocalLength) {
              label.push(`等效焦距: ${equivalentFocalLength}mm`);
            }
            
            // 4. 镜头光圈 (物理光圈)
            if (details.physicalApertureValue) {
              label.push(`镜头光圈: f/${details.physicalApertureValue}`);
            }
            
            // 5. 等效光圈
            label.push(`等效光圈: F${context.parsed.y.toFixed(1)}`);

            return label;
          },
          afterLabel: function(context: any) {
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
  const calculateApertureAtFocalLength = (targetFocal: number, lenses: LensInfo[]): number | null => {
    if (!lenses || lenses.length === 0) return null;

    // 边界规则：不向更广角模拟
    const minFocal = Math.min(...lenses.map(l => l.focalLength));
    if (targetFocal < minFocal) return null;

    // 如果有精确匹配的原生焦段，直接返回
    const exactMatch = lenses.find(l => l.focalLength === targetFocal);
    if (exactMatch) return exactMatch.aperture;

    // 找到最合适的镜头进行计算
    let bestLens = null;
    let minDistance = Infinity;

    for (const lens of lenses) {
      // 只使用等于或小于目标焦距的镜头
      if (lens.focalLength <= targetFocal) {
        const distance = targetFocal - lens.focalLength;
        if (distance < minDistance) {
          minDistance = distance;
          bestLens = lens;
        }
      }
    }

    // 如果没有找到合适的镜头，使用最接近的镜头
    if (!bestLens) {
      bestLens = lenses.reduce((closest, lens) => 
        Math.abs(lens.focalLength - targetFocal) < Math.abs(closest.focalLength - targetFocal) 
          ? lens : closest
      );
    }

    // 获取物理参数进行计算
    const dataset = chartData.datasets.find(d => d.originalLenses?.some(l => 
      l.focalLength === bestLens.focalLength && l.aperture === bestLens.aperture
    ));

    if (dataset) {
      const originalLens = dataset.originalLenses.find(l => 
        l.focalLength === bestLens.focalLength && l.aperture === bestLens.aperture
      ) as any;

      if (originalLens?.physicalApertureValue && originalLens?.conversionFactor) {
        // 使用物理参数计算：等效光圈 = 物理光圈 × 转换系数 × (目标焦距 / 原始焦距)
        const calculatedAperture = (originalLens.physicalApertureValue * originalLens.conversionFactor / bestLens.focalLength) * targetFocal;
        return Number(calculatedAperture.toFixed(1));
      }
    }

    // 如果没有物理参数，使用简单的线性插值
    const ratio = targetFocal / bestLens.focalLength;
    return Number((bestLens.aperture * ratio).toFixed(1));
  };

  // 获取所有焦段（标准焦段 + 原生焦段）
  const getAllFocalLengths = useMemo(() => {
    const standardFocals = MAJOR_FOCAL_LENGTHS; // [12, 16, 24, 28, 35, 50, 75, 85, 105, 120, 135, 200]
    const nativeFocals = new Set<number>();

    // 收集所有机型的原生焦段
    chartData.datasets.forEach(dataset => {
      if (dataset.originalLenses) {
        dataset.originalLenses.forEach(lens => {
          nativeFocals.add(lens.focalLength);
        });
      }
    });

    // 合并并去重，然后排序
    const allFocals = [...new Set([...standardFocals, ...Array.from(nativeFocals)])];
    return allFocals.sort((a, b) => a - b);
  }, [chartData]);

  // 生成表格数据
  const generateTableData = () => {
    const tableData: { [phone: string]: { [focal: string]: number | null } } = {};
    
    filteredDatasets.forEach(dataset => {
      const phoneName = dataset.label;
      tableData[phoneName] = {};
      
      const lenses = dataset.originalLenses || [];
      
      getAllFocalLengths.forEach(focal => {
        const aperture = calculateApertureAtFocalLength(focal, lenses);
        tableData[phoneName][`${focal}mm`] = aperture;
      });
    });
    
    return tableData;
  };

  const tableData = useMemo(() => generateTableData(), [filteredDatasets, getAllFocalLengths]);

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
            <button 
              onClick={() => window.history.back()}
              className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors flex items-center justify-center"
              aria-label="返回"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
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
                        <p>• "-"：无法计算（目标焦段比该机型最广角镜头更广）</p>
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