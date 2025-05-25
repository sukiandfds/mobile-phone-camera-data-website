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

  // 获取品牌的机型列表 - 简化，不再需要 expandedBrands
  const getBrandPhones = (brand: string) => {
    const brandPhones = phoneData[brand] || [];
    return brandPhones
      .filter(phone => phone.releaseYear) // Ensure releaseYear exists for sorting
      .sort((a, b) => b.releaseYear - a.releaseYear); // Sort by release year, newest first
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
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Navigation / Header Area */}
      <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Back Button */}
          <button 
            onClick={() => window.history.back()}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="返回"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>

          {/* Center: Titles */}
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold">手机后置摄像头 - 等效光圈</h1>
            <p className="text-xs sm:text-sm text-gray-400">部分手机的后置摄像头的等效光圈</p>
          </div>

          {/* Right: View Mode Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              查看曲线
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              查看表格
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-xl">加载中...</div>
          </div>
        ) : (
          <>
            {/* Chart Area / Table Area */}
            <section className="mb-6">
              {viewMode === 'chart' ? (
                <div className="bg-gray-900 rounded-lg p-4 sm:p-6 h-[50vh] sm:h-[60vh] md:h-[70vh]">
                  {MAJOR_FOCAL_LENGTHS.length > 0 ? ( // Ensure MAJOR_FOCAL_LENGTHS is populated
                    <Line data={chartDataForRender} options={chartOptions} />
                  ) : (
                    <div className="text-white text-center">图表数据仍在加载或初始化...</div>
                  )}
                </div>
              ) : (
                // 等效光圈数据表格
                <div className="bg-gray-900 rounded-lg p-4 sm:p-6 overflow-x-auto">
                  <h3 className="text-xl font-semibold mb-4 text-white">等效光圈数据表格</h3>
                  {Object.keys(tableData).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-white border-collapse">
                        <thead>
                          <tr>
                            <th className="sticky left-0 bg-gray-800 border border-gray-600 px-3 py-2 text-left font-medium">
                              机型
                            </th>
                            {getAllFocalLengths.map(focal => (
                              <th key={focal} className="border border-gray-600 px-3 py-2 text-center font-medium min-w-[70px]">
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
                              <tr key={phoneName} className="hover:bg-gray-800">
                                <td 
                                  className="sticky left-0 bg-gray-800 border border-gray-600 px-3 py-2 font-medium"
                                  style={{ color: brandColor }}
                                >
                                  {phoneName}
                                </td>
                                {getAllFocalLengths.map(focal => {
                                  const focalKey = `${focal}mm`;
                                  const aperture = phoneData[focalKey];
                                  const isNative = dataset?.originalLenses?.some(l => l.focalLength === focal);
                                  
                                  return (
                                    <td key={focal} className="border border-gray-600 px-3 py-2 text-center">
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
            <section className="mb-6 text-center">
              <button
                onClick={hideAll}
                className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors mr-3 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                全部隐藏
              </button>
              <button
                onClick={showAll} 
                className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                全部显示
              </button>
            </section>

            {/* Phone Selection Area (Pills) */}
            <section>
              {Object.keys(phoneData).map(brand => {
                const brandPhones = getBrandPhones(brand); // This function needs to be adapted or replaced
                if (brandPhones.length === 0) return null;

                return (
                  <div key={brand} className="mb-6">
                    <h3 className="text-xl font-semibold mb-3 text-white border-b border-gray-700 pb-2">
                      {BRAND_NAMES[brand as keyof typeof BRAND_NAMES] || brand}
                    </h3>
                    <div className="flex flex-wrap gap-2">
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
                            className={`p-2.5 px-3.5 rounded-xl text-xs transition-all duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-75 shadow-md hover:shadow-lg
                              ${isVisible 
                                ? 'text-white' // Specific brand color is applied via style
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 focus:ring-gray-600' // Unselected state
                              }`}
                            style={{
                              backgroundColor: isVisible 
                                ? (BRAND_COLORS[brand as keyof typeof BRAND_COLORS] || '#4A5568') // fallback color if brand color is missing
                                : '#2D3748', // Equivalent to bg-gray-800 for unselected, ensures consistency
                              borderColor: isVisible 
                                ? (BRAND_COLORS[brand as keyof typeof BRAND_COLORS] || '#4A5568') 
                                : '#4A5568', // border-gray-600
                              borderWidth: '1px',
                              // Consider adding a subtle box-shadow if needed to match pic more closely
                            }}
                          >
                            <div className="font-bold text-sm mb-0.5">{phone.name}</div>
                            <div className="opacity-90 text-[11px]">{releaseDisplayDate}</div>
                            <div className="opacity-90 text-[11px]">{focalRange}</div>
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