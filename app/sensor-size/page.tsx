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

// Define a new interface for the details of a point on the sensor size chart
interface SensorPointDetails {
  note: string;
  focalLengthData: number;
  displaySensorSize: string;
  rawSensorSize: number;
  nativeSensorSpec?: string;      // For actual points
  basisFocalLength?: number;      // For virtual points: the focal length of the lens used as basis
  basisOriginalSensorSize?: string; // For virtual points: the original sensor spec of the basis lens
  // Index signature to allow other properties, aligning with ChartDataset details options
  [key: string]: string | number | boolean | LensDetail | SensorPointDetails | undefined | null;
}

interface ChartDataset {
  label: string;
  data: Array<{ x: number; y: number; details: SensorPointDetails | LensDetail | null | { note: string, [key: string]: string | number | boolean | LensDetail | null }; originalFocalLength: number; pointType?: string } | number | null>;
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

// 传感器尺寸刻度（从大到小）
// const SENSOR_SIZE_SCALE = [1.0, 1/1.3, 1/1.4, 1/1.5, 1/1.6, 1/1.8, 1/2.0, 1/2.5, 1/3.0, 1/4.0, 1/5.0]; // REMOVED

// Helper function to parse sensor size string (e.g., "1/2.51" -> 1/2.51)
function parseSensorSize(sensorSizeStr: string): number {
  if (sensorSizeStr.includes('/')) {
    const parts = sensorSizeStr.split('/');
    return parseFloat(parts[0]) / parseFloat(parts[1]);
  }
  return parseFloat(sensorSizeStr);
}

// Helper function to calculate equivalent sensor size at target focal length
function calculateEquivalentSensorSize(originalSensorSize: string, originalFocalLength: number, targetFocalLength: number): number {
  const cropFactor = targetFocalLength / originalFocalLength;
  const originalSize = parseSensorSize(originalSensorSize);
  
  // 计算等效传感器尺寸（裁切后变小）
  const equivalentSize = originalSize / cropFactor;
  
  // 转换基准：<1/2英寸传感器需要从18mm基准转为16mm基准
  if (originalSize < 1/2.0) {
    // 原始是18mm基准，转换为16mm基准显示
    const actualDiagonal18mm = 18 * originalSize;
    const croppedDiagonal18mm = actualDiagonal18mm / cropFactor;
    // 转换为16mm基准下的等效尺寸
    return (croppedDiagonal18mm / 18) * (18 / 16);
  } else {
    // >=1/2英寸传感器直接使用16mm基准
    return equivalentSize;
  }
}

// Helper function to format sensor size for display
function formatSensorSize(size: number): string {
  const fraction = 1 / size;
  const fractionStr = fraction.toFixed(2).replace(/\.?0+$/, '');
  if (fractionStr === '0.75') return '4/3'; // Special case for 1/0.75
  if (Number.isInteger(parseFloat(fractionStr))) return `1/${parseFloat(fractionStr).toFixed(0)}`;
  return `1/${fractionStr}`;
}

// Define major focal lengths (will be populated from chartData.labels)
let MAJOR_FOCAL_LENGTHS: number[] = [];

interface SensorAxisDefinition {
    value: number; // The actual numeric value of the sensor size
    label: string; // The display label (e.g., "1/1.25")
}

const CUSTOM_SENSOR_Y_AXIS_DEFINITIONS: SensorAxisDefinition[] = [];
const denominatorsCorrected = [];
for (let d = 0.75; d <= 5; d += 0.25) {
    denominatorsCorrected.push(d);
}

denominatorsCorrected.forEach(d => {
    let label;
    if (d === 0.75) label = "4/3";
    else if (Number.isInteger(d)) label = `1/${d}`;
    else label = `1/${d.toFixed(2).replace(/\.?0+$/, '')}`;
    CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.push({ value: 1/d, label: label });
});

// Sort by sensor value, descending (largest sensor size first, for definition purposes)
CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.sort((a, b) => b.value - a.value);

// New helper function to map a sensor VALUE to its interpolated Y-axis position
// on an equidistant categorical scale represented by CUSTOM_SENSOR_Y_AXIS_DEFINITIONS
function mapSensorValueToEquidistantYPosition(sensorValue: number | null | undefined): number | null {
    if (sensorValue === null || sensorValue === undefined) return null;
    if (CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.length === 0) return null;

    // CUSTOM_SENSOR_Y_AXIS_DEFINITIONS is sorted by value descending (largest sensor first, e.g., def[0] is "4/3")
    // Y-axis is reversed, so index 0 is at the top.

    // Check if sensorValue is outside the bounds of defined ticks
    if (sensorValue >= CUSTOM_SENSOR_Y_AXIS_DEFINITIONS[0].value) {
        return 0; // Snap to the top-most category (index 0)
    }
    if (sensorValue <= CUSTOM_SENSOR_Y_AXIS_DEFINITIONS[CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.length - 1].value) {
        return CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.length - 1; // Snap to the bottom-most category (index N-1)
    }

    // Find the segment sensorValue falls into
    for (let i = 0; i < CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.length - 1; i++) {
        const upperDef = CUSTOM_SENSOR_Y_AXIS_DEFINITIONS[i];       // Corresponds to y-position i
        const lowerDef = CUSTOM_SENSOR_Y_AXIS_DEFINITIONS[i+1];   // Corresponds to y-position i+1

        if (sensorValue <= upperDef.value && sensorValue > lowerDef.value) {
            if (upperDef.value === lowerDef.value) { // Should not happen with unique definitions
                return i; 
            }
            // Calculate the fraction of how far sensorValue is from lowerDef.value towards upperDef.value
            const fractionFromLower = (sensorValue - lowerDef.value) / (upperDef.value - lowerDef.value);
            // Interpolate the y-position: index (i+1) is lower, index i is upper.
            // Y-position = lower_index - fraction_from_lower * (lower_index - upper_index)
            // Y-position = (i+1) - fractionFromLower * ((i+1) - i) = (i+1) - fractionFromLower
            return (i + 1) - fractionFromLower;
        }
    }
    
    // Fallback, should ideally be caught by boundary checks or loop
    // This might happen if sensorValue is exactly CUSTOM_SENSOR_Y_AXIS_DEFINITIONS[CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.length - 1].value
    // which is handled by the boundary check already.
    return CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.length - 1; 
}

export default function PhoneSensorSizeComparison() {
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
          
          const FOCAL_LENGTH_AT_END = 200; // Define the maximum focal length for extension

          // Transform datasets to generate points like the comparison page
          const transformedDatasets = loadedChartData.datasets.map(dataset => {
            const originalLensesSorted = (dataset.originalLenses || []).slice().sort((a,b) => a.focalLength - b.focalLength);
            const newPoints: Array<{ x: number; y: number; details: SensorPointDetails; originalFocalLength: number; pointType: string }> = [];
            
            const MAJOR_FOCAL_LENGTHS_NUM = MAJOR_FOCAL_LENGTHS.length > 0 
                ? MAJOR_FOCAL_LENGTHS 
                : (loadedChartData?.labels?.map(l => parseFloat(l.replace('mm', ''))) || []);

            if (originalLensesSorted.length > 0) {
              for (let i = 0; i < originalLensesSorted.length; i++) {
                const currentActualLens = originalLensesSorted[i];
                const nextOriginalLens = (i + 1 < originalLensesSorted.length) ? originalLensesSorted[i + 1] : null;

                const lensDetailsForCurrent = dataset.lensDetails?.[currentActualLens.focalLength.toString()];
                const originalSensorSpec = lensDetailsForCurrent?.sensorSize;

                if (!originalSensorSpec) {
                  console.warn(`[SensorSizeChart] Sensor spec not found for ${dataset.label} at ${currentActualLens.focalLength}mm. Skipping this lens segment.`);
                  continue; 
                }

                // 1. Add 'actual' point for currentActualLens
                const calculatedSizeActual = calculateEquivalentSensorSize(originalSensorSpec, currentActualLens.focalLength, currentActualLens.focalLength);
                const yPositionActual = mapSensorValueToEquidistantYPosition(calculatedSizeActual);

                if (yPositionActual !== null) {
                  newPoints.push({
                    x: currentActualLens.focalLength,
                    y: yPositionActual, 
                    details: {
                        note: `原生镜头 (${currentActualLens.focalLength}mm)`,
                        focalLengthData: currentActualLens.focalLength,
                        displaySensorSize: formatSensorSize(calculatedSizeActual),
                        rawSensorSize: calculatedSizeActual,
                        nativeSensorSpec: originalSensorSpec
                    },
                    originalFocalLength: currentActualLens.focalLength,
                    pointType: 'actual'
                  });
                }

                const extendToFL = nextOriginalLens ? nextOriginalLens.focalLength : FOCAL_LENGTH_AT_END;

                // 2. Add 'virtual_connector' points
                MAJOR_FOCAL_LENGTHS_NUM.forEach(majorFL => {
                  if (currentActualLens.focalLength < majorFL && majorFL < extendToFL) {
                    const calculatedSizeConnector = calculateEquivalentSensorSize(originalSensorSpec, currentActualLens.focalLength, majorFL);
                    const yPositionConnector = mapSensorValueToEquidistantYPosition(calculatedSizeConnector);
                    if (yPositionConnector !== null) {
                      newPoints.push({
                        x: majorFL,
                        y: yPositionConnector, 
                        details: {
                            note: `计算连接点 @ ${majorFL}mm (基于 ${currentActualLens.focalLength}mm 镜头)`,
                            focalLengthData: majorFL,
                            displaySensorSize: formatSensorSize(calculatedSizeConnector),
                            rawSensorSize: calculatedSizeConnector,
                            basisFocalLength: currentActualLens.focalLength,
                            basisOriginalSensorSize: originalSensorSpec
                        },
                        originalFocalLength: majorFL,
                        pointType: 'virtual_connector'
                      });
                    }
                  }
                });

                // 3. Add 'virtual_segment_end' point
                if (extendToFL > currentActualLens.focalLength) {
                    const calculatedSizeEnd = calculateEquivalentSensorSize(originalSensorSpec, currentActualLens.focalLength, extendToFL);
                    const yPositionEnd = mapSensorValueToEquidistantYPosition(calculatedSizeEnd);

                    if (yPositionEnd !== null) {
                      newPoints.push({
                        x: extendToFL,
                        y: yPositionEnd, 
                        details: {
                            note: `理论末端 @ ${extendToFL}mm (基于 ${currentActualLens.focalLength}mm 镜头)`,
                            focalLengthData: extendToFL,
                            displaySensorSize: formatSensorSize(calculatedSizeEnd),
                            rawSensorSize: calculatedSizeEnd,
                            basisFocalLength: currentActualLens.focalLength,
                            basisOriginalSensorSize: originalSensorSpec
                        },
                        originalFocalLength: extendToFL,
                        pointType: 'virtual_segment_end'
                      });
                    }
                }
              }
            }
            
            newPoints.sort((a, b) => {
              if (a.x < b.x) return -1;
              if (a.x > b.x) return 1;
              // If x is the same, preserve the original push order.
              // This is crucial for Chart.js to draw vertical lines correctly when
              // a segment_end point from a previous lens and an actual point from the current lens
              // share the same x-coordinate.
              return 0; 
            });
            
            const newDataset: ChartDataset = {
              ...dataset,
              data: newPoints,
              tension: 0, 
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
          return 0; // Invisible for virtual points
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
        min: MAJOR_FOCAL_LENGTHS.length > 0 ? Math.min(...MAJOR_FOCAL_LENGTHS) * 0.9 : 10, 
        max: MAJOR_FOCAL_LENGTHS.length > 0 ? Math.max(...MAJOR_FOCAL_LENGTHS) * 1.05 : 220,
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
        reverse: true, // CHANGED: Index 0 (largest sensor label) at top
        type: 'linear' as const,
        title: {
            display: true,
            text: '等效传感器大小 ("英寸"/type)',
            color: '#999999',
            font: { size: 12 }
        },
        min: 0, // CHANGED: Y-axis scale is 0 to N-1
        max: CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.length > 0 ? CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.length - 1 : 0, // CHANGED
        ticks: {
          color: '#999999',
          font: {
            size: 11
          },
          autoSkip: false, 
          stepSize: 1, // Ensure a tick for each category index
          callback: function(value: unknown) { 
            const tickIndex = Number(value);
            if (Number.isInteger(tickIndex) && tickIndex >= 0 && tickIndex < CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.length) {
              return CUSTOM_SENSOR_Y_AXIS_DEFINITIONS[tickIndex]?.label || '';
            }
            return '';
          }
        },
        afterBuildTicks: (axis: import('chart.js').Scale) => { 
          const newTicks: import('chart.js').Tick[] = [];
          if (CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.length > 0) {
            for(let i = 0; i < CUSTOM_SENSOR_Y_AXIS_DEFINITIONS.length; i++) {
                // Create ticks for indices 0, 1, ..., N-1
                if (i >= axis.min && i <= axis.max) { // axis.min/max should be 0 and N-1
                    newTicks.push({ value: i, label: CUSTOM_SENSOR_Y_AXIS_DEFINITIONS[i].label });
                }
            }
          }
          axis.ticks = newTicks; 
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
            }
            
            // 如果没有实际点位，检查理论点
            const theoreticalItems = tooltipItems.filter(item => (item.raw as { details?: { note?: string } })?.details?.note);
            if (theoreticalItems.length > 0 && (theoreticalItems[0].raw as { details?: { note?: string } })?.details) { 
              return ((theoreticalItems[0].raw as { details: { note: string } }).details).note;
            }
            
            return '';
          },
          label: function(context: TooltipItem<'line'>) {
            const rawData = context.raw as { 
              pointType?: string, 
              details?: LensDetail | null | ({ note: string } & LensInfo), // More specific type for details
              originalFocalLength?: number 
            }; 
            const pointType = rawData?.pointType;

            if (pointType !== 'actual') {
                if (rawData?.details && 'note' in rawData.details && typeof (rawData.details as { note: string }).note === 'string') return `Y: ${context.parsed.y.toFixed(1)}`;
                return '';
            }

            const details = rawData?.details as ({ note: string } & LensInfo); // More specific type for details when actual
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
            
            // Use displaySensorSize from point details if available
            // Ensure rawData.details is treated as SensorPointDetails for type safety when accessing its properties
            const pointDetails = rawData?.details as SensorPointDetails | undefined;

            if (pointDetails?.displaySensorSize) {
                label.push(`等效传感器大小: ${pointDetails.displaySensorSize}`);
            } else if (pointDetails?.rawSensorSize) {
                 // Fallback if displaySensorSize is not in details, but rawSensorSize is
                label.push(`等效传感器大小: ${formatSensorSize(pointDetails.rawSensorSize)}`);
            } else {
                // Further fallback if no sensor size info in details - this should be rare for valid points
                // label.push(`等效传感器大小: N/A`); // Or some other placeholder
            }
            
            if (details?.physicalApertureValue) {
              label.push(`镜头光圈: f/${details.physicalApertureValue}`);
            }
            
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

  // 计算特定焦距的等效传感器大小
  const calculateSensorSizeAtFocalLength = useCallback((targetFocal: number, lenses: LensInfo[], lensDetails: { [key: string]: LensDetail }): { size: number | null, isNative: boolean, originalSensorSize?: string, basisFocalLength?: number, basisOriginalSensorSize?: string } => {
    if (!lenses || lenses.length === 0) return { size: null, isNative: false };

    // 检查是否为原生焦段
    const nativeLens = lenses.find(l => l.focalLength === targetFocal);
    if (nativeLens) {
      const nativeLensDetail = lensDetails[targetFocal.toString()];
      if (nativeLensDetail?.sensorSize) {
        const equivalentSize = calculateEquivalentSensorSize(nativeLensDetail.sensorSize, targetFocal, targetFocal);
        return { 
          size: equivalentSize, 
          isNative: true, 
          originalSensorSize: nativeLensDetail.sensorSize 
        };
      }
    }

    // 边界规则：不向更广角模拟
    const minFocal = Math.min(...lenses.map(l => l.focalLength));
    if (targetFocal < minFocal) return { size: null, isNative: false };

    // 找到最合适的镜头进行计算
    let bestLens: LensInfo | null = null; // Ensure bestLens is explicitly LensInfo or null
    let minDistance = Infinity;

    for (const lens of lenses) {
      if (lens.focalLength <= targetFocal) {
        const distance = targetFocal - lens.focalLength;
        if (distance < minDistance) {
          minDistance = distance;
          bestLens = lens;
        }
      }
    }

    if (!bestLens) {
      // Fallback if no lens is <= targetFocal (e.g. targetFocal is larger than all native lenses)
      // In this scenario, usually the largest focal length native lens is used as basis.
      if (lenses.length > 0) {
        bestLens = lenses.reduce((prev, current) => (prev.focalLength > current.focalLength) ? prev : current);
      }
    }
    
    if (!bestLens) return { size: null, isNative: false }; // No suitable lens found

    // 获取传感器信息进行计算
    const bestLensDetail = lensDetails[bestLens.focalLength.toString()];
    if (bestLensDetail?.sensorSize) {
      const equivalentSize = calculateEquivalentSensorSize(bestLensDetail.sensorSize, bestLens.focalLength, targetFocal);
      return { 
        size: equivalentSize, 
        isNative: false, 
        basisFocalLength: bestLens.focalLength, 
        basisOriginalSensorSize: bestLensDetail.sensorSize 
      };
    }

    return { size: null, isNative: false };
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
  }, [filteredDatasets, MAJOR_FOCAL_LENGTHS]); // Changed dependencies to filteredDatasets and MAJOR_FOCAL_LENGTHS

  // 生成表格数据
  const generateTableData = useCallback(() => {
    const tableDataGenerated: { [phone: string]: { [focal: string]: number | null } } = {};
    
    filteredDatasets.forEach(dataset => {
      const phoneName = dataset.label;
      tableDataGenerated[phoneName] = {};
      
      const lenses = dataset.originalLenses || [];
      const lensDetails = dataset.lensDetails || {};
      
      getAllFocalLengths.forEach(focal => {
        const { size } = calculateSensorSizeAtFocalLength(focal, lenses, lensDetails);
        tableDataGenerated[phoneName][`${focal}mm`] = size;
      });
    });
    
    return tableDataGenerated;
  }, [filteredDatasets, getAllFocalLengths, calculateSensorSizeAtFocalLength]); // Added dependencies

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
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">手机后置摄像头 - 等效传感器大小</h1>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">部分手机的后置摄像头的等效传感器大小</p>
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
                // 等效传感器大小数据表格
                <div className="bg-gray-900 rounded-lg p-4 sm:p-6 animate-scale-in">
                  <h3 className="text-xl font-semibold mb-4 text-white">等效传感器大小数据表格</h3>
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
                            {Object.entries(tableData).map(([phoneName]) => {
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
                                    const result = calculateSensorSizeAtFocalLength(focal, dataset?.originalLenses || [], dataset?.lensDetails || {});
                                    const { size, isNative, originalSensorSize } = result;
                                    
                                    return (
                                      <td key={focal} className="border border-gray-600 px-3 py-2 text-center min-w-[80px] whitespace-nowrap">
                                        {size !== null ? (
                                          <div className={isNative ? 'font-bold' : 'opacity-75'}>
                                            {isNative && originalSensorSize && parseSensorSize(originalSensorSize) < 1/2.0 ? (
                                              // 双行显示：16mm基准和18mm基准
                                              <div className="text-xs">
                                                <div title="16mm基准">{formatSensorSize(size)}</div>
                                                <div title="18mm基准" className="opacity-75">
                                                  {originalSensorSize}
                                                </div>
                                              </div>
                                            ) : (
                                              // 单行显示
                                              <span title={isNative ? '原生焦段' : '计算值'}>
                                                {formatSensorSize(size)}
                                              </span>
                                            )}
                                          </div>
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
                        <p>• <strong>粗体</strong>：原生镜头焦段的实际等效传感器大小值</p>
                        <p>• 普通字体：基于物理参数计算的理论等效传感器大小值</p>
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