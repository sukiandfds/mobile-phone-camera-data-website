import * as XLSX from 'xlsx';

export interface ExcelLoaderConfig {
  phoneDataSheet: string;
  chartDataSheet: string;
  focalLengthSheet?: string;
}

export class ExcelDataLoader {
  private config: ExcelLoaderConfig;

  constructor(config: ExcelLoaderConfig = {
    phoneDataSheet: '手机基本信息',
    chartDataSheet: '图表数据',
    focalLengthSheet: '焦段数据'
  }) {
    this.config = config;
  }

  /**
   * 从URL加载Excel文件
   */
  async loadFromUrl(url: string) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return this.parseExcel(arrayBuffer);
    } catch (error) {
      console.error('加载Excel文件失败:', error);
      throw new Error('无法加载Excel文件');
    }
  }

  /**
   * 从文件输入加载Excel
   */
  async loadFromFile(file: File) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      return this.parseExcel(arrayBuffer);
    } catch (error) {
      console.error('解析Excel文件失败:', error);
      throw new Error('无法解析Excel文件');
    }
  }

  /**
   * 解析Excel数据
   */
  private parseExcel(arrayBuffer: ArrayBuffer) {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const result: any = {};

    // 解析手机基本信息
    if (workbook.SheetNames.includes(this.config.phoneDataSheet)) {
      const phoneSheet = workbook.Sheets[this.config.phoneDataSheet];
      const phoneData = XLSX.utils.sheet_to_json(phoneSheet);
      result.phones = this.processPhoneData(phoneData);
    }

    // 解析图表数据
    if (workbook.SheetNames.includes(this.config.chartDataSheet)) {
      const chartSheet = workbook.Sheets[this.config.chartDataSheet];
      const chartData = XLSX.utils.sheet_to_json(chartSheet);
      result.chartDatasets = this.processChartData(chartData);
    }

    // 解析焦段数据
    if (this.config.focalLengthSheet && workbook.SheetNames.includes(this.config.focalLengthSheet)) {
      const focalSheet = workbook.Sheets[this.config.focalLengthSheet];
      const focalData = XLSX.utils.sheet_to_json(focalSheet);
      result.focalLengthData = this.processFocalLengthData(focalData);
    }

    return result;
  }

  private processPhoneData(rawData: any[]) {
    const brands: { [key: string]: any[] } = {};
    
    rawData.forEach(row => {
      const brand = row['品牌'] || row['brand'] || '未知品牌';
      const phone = {
        name: row['型号'] || row['model'] || '',
        releaseDate: row['发布时间'] || row['release_date'] || '',
        aperture: row['光圈范围'] || row['aperture_range'] || '',
        focalLength: row['焦段范围'] || row['focal_length_range'] || '',
        mainCamera: row['主摄'] || row['main_camera'],
        ultraWide: row['超广角'] || row['ultra_wide'],
        telephoto: row['长焦'] || row['telephoto']
      };

      if (!brands[brand]) {
        brands[brand] = [];
      }
      brands[brand].push(phone);
    });

    return brands;
  }

  private processChartData(rawData: any[]) {
    const colors = [
      '#FF6B35', '#1E88E5', '#43A047', '#E53935', '#8E24AA',
      '#FF8A50', '#42A5F5', '#66BB6A', '#EF5350', '#AB47BC',
      '#FFA726', '#64B5F6', '#81C784', '#F44336', '#5C6BC0'
    ];

    return rawData.map((row, index) => ({
      label: row['机型'] || row['model'] || '',
      data: [
        parseFloat(row['13mm'] || 0),
        parseFloat(row['24mm'] || 0),
        parseFloat(row['35mm'] || 0),
        parseFloat(row['50mm'] || 0),
        parseFloat(row['77mm'] || 0),
        parseFloat(row['120mm'] || 0),
        parseFloat(row['200mm'] || 0)
      ],
      borderColor: row['颜色'] || row['color'] || colors[index % colors.length],
      backgroundColor: this.generateBackgroundColor(row['颜色'] || row['color'] || colors[index % colors.length]),
      tension: 0.4,
    }));
  }

  private processFocalLengthData(rawData: any[]) {
    return rawData.map(row => ({
      focalLength: row['焦段'] || row['focal_length'] || '',
      label: row['标签'] || row['label'] || '',
      description: row['描述'] || row['description'] || ''
    }));
  }

  private generateBackgroundColor(borderColor: string) {
    if (!borderColor) return 'rgba(0, 0, 0, 0.1)';
    
    // 提取RGB值并转换为半透明背景色
    const hex = borderColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgba(${r}, ${g}, ${b}, 0.1)`;
  }
}

// 使用示例
export const excelLoader = new ExcelDataLoader();

// Hook for React
import { useState, useEffect } from 'react';

export function useExcelData(url?: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (source: string | File) => {
    setLoading(true);
    setError(null);
    
    try {
      let result;
      if (typeof source === 'string') {
        result = await excelLoader.loadFromUrl(source);
      } else {
        result = await excelLoader.loadFromFile(source);
      }
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (url) {
      loadData(url);
    }
  }, [url]);

  return { data, loading, error, loadData };
} 