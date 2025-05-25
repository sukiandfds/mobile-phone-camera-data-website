const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Excel转JSON数据处理脚本
 * 使用方法：
 * 1. 将Excel文件放在data文件夹中
 * 2. 运行：node scripts/excel-to-json.js [excel文件名]
 */

function excelToJson(excelFilePath, outputDir = './data') {
  try {
    // 读取Excel文件
    const workbook = XLSX.readFile(excelFilePath);
    const result = {};

    // 遍历每个表格
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // 根据表格名称处理数据
      if (sheetName.includes('手机基本信息') || sheetName.includes('phones')) {
        result.phones = processPhoneData(jsonData);
      } else if (sheetName.includes('图表数据') || sheetName.includes('chart')) {
        result.chartData = processChartData(jsonData);
      } else if (sheetName.includes('焦段数据') || sheetName.includes('focal')) {
        result.focalLengthData = processFocalLengthData(jsonData);
      }
    });

    // 输出JSON文件
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 分别输出不同的数据文件
    if (result.phones) {
      fs.writeFileSync(
        path.join(outputDir, 'phones-data.json'),
        JSON.stringify(result.phones, null, 2),
        'utf8'
      );
      console.log('✅ 手机数据已导出到 phones-data.json');
    }

    if (result.chartData) {
      fs.writeFileSync(
        path.join(outputDir, 'chart-data.json'),
        JSON.stringify(result.chartData, null, 2),
        'utf8'
      );
      console.log('✅ 图表数据已导出到 chart-data.json');
    }

    // 生成TypeScript类型定义
    generateTypeDefinitions(outputDir);
    
    console.log('🎉 数据转换完成！');
    
  } catch (error) {
    console.error('❌ 转换失败:', error.message);
  }
}

function processPhoneData(rawData) {
  const brands = {};
  
  rawData.forEach(row => {
    const brand = row['品牌'] || row['brand'];
    const phone = {
      name: row['型号'] || row['model'],
      releaseDate: row['发布时间'] || row['release_date'],
      aperture: row['光圈范围'] || row['aperture_range'],
      focalLength: row['焦段范围'] || row['focal_length_range'],
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

function processChartData(rawData) {
  return rawData.map(row => ({
    label: row['机型'] || row['model'],
    data: [
      parseFloat(row['13mm'] || 0),
      parseFloat(row['24mm'] || 0),
      parseFloat(row['35mm'] || 0),
      parseFloat(row['50mm'] || 0),
      parseFloat(row['77mm'] || 0),
      parseFloat(row['120mm'] || 0),
      parseFloat(row['200mm'] || 0)
    ],
    borderColor: row['颜色'] || generateColor(),
    backgroundColor: row['背景色'] || generateBackgroundColor(row['颜色']),
    tension: 0.4
  }));
}

function processFocalLengthData(rawData) {
  return rawData.map(row => ({
    focalLength: row['焦段'] || row['focal_length'],
    label: row['标签'] || row['label'],
    description: row['描述'] || row['description']
  }));
}

function generateColor() {
  const colors = [
    '#FF6B35', '#1E88E5', '#43A047', '#E53935', '#8E24AA',
    '#FF8A50', '#42A5F5', '#66BB6A', '#EF5350', '#AB47BC',
    '#FFA726', '#64B5F6', '#81C784', '#F44336', '#5C6BC0'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function generateBackgroundColor(borderColor) {
  if (!borderColor) return 'rgba(0, 0, 0, 0.1)';
  
  // 提取RGB值并转换为半透明背景色
  const hex = borderColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
}

function generateTypeDefinitions(outputDir) {
  const typeDefinitions = `
export interface PhoneData {
  name: string;
  releaseDate: string;
  aperture: string;
  focalLength: string;
  mainCamera?: string;
  ultraWide?: string;
  telephoto?: string;
}

export interface ChartDataPoint {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
}

export interface FocalLengthData {
  focalLength: string;
  label: string;
  description?: string;
}

export interface PhoneBrandData {
  [brand: string]: PhoneData[];
}
`;

  fs.writeFileSync(
    path.join(outputDir, 'types.ts'),
    typeDefinitions,
    'utf8'
  );
  console.log('✅ TypeScript类型定义已生成');
}

// 命令行参数处理
const args = process.argv.slice(2);
const excelFile = args[0];

if (!excelFile) {
  console.log(`
📋 Excel转JSON工具使用说明

使用方法：
  node scripts/excel-to-json.js <Excel文件路径>

示例：
  node scripts/excel-to-json.js ./data/手机数据.xlsx

Excel文件格式要求：
  • 表格1: 手机基本信息 (品牌、型号、发布时间、光圈范围、焦段范围)
  • 表格2: 图表数据 (机型、13mm、24mm、35mm、50mm、77mm、120mm、200mm)
  • 表格3: 焦段数据 (可选)
  `);
  process.exit(1);
}

if (!fs.existsSync(excelFile)) {
  console.error(`❌ 文件不存在: ${excelFile}`);
  process.exit(1);
}

excelToJson(excelFile); 