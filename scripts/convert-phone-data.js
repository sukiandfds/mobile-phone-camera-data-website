const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * 专门转换手机摄像头数据的脚本
 * Excel文件包含8个工作表：小米机型、VIVO机型、OPPO机型、苹果机型、三星机型、华为机型、荣耀机型、努比亚机型
 */

// 工作表到品牌名称的映射
const BRAND_MAPPING = {
  '小米机型': 'xiaomi',
  'VIVO机型': 'vivo', 
  'OPPO机型': 'oppo',
  '苹果机型': 'apple',
  '三星机型': 'samsung',
  '华为机型': 'huawei',
  '荣耀机型': 'honor',
  '努比亚机型': 'nubia'
};

// 品牌颜色配置
const BRAND_COLORS = {
  xiaomi: ['#FF6B35', '#FF8A50', '#FFA726', '#FFB74D', '#FFCC80'],
  vivo: ['#8E24AA', '#AB47BC', '#BA68C8', '#CE93D8', '#E1BEE7'],
  oppo: ['#43A047', '#66BB6A', '#81C784', '#A5D6A7', '#C8E6C9'],
  apple: ['#1E88E5', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB'],
  samsung: ['#E53935', '#EF5350', '#F44336', '#EF5350', '#FFCDD2'],
  huawei: ['#F57C00', '#FF9800', '#FFB74D', '#FFCC80', '#FFE0B2'],
  honor: ['#7B1FA2', '#9C27B0', '#BA68C8', '#CE93D8', '#E1BEE7'],
  nubia: ['#D32F2F', '#F44336', '#EF5350', '#E57373', '#FFCDD2']
};

function convertPhoneData(excelFilePath) {
  try {
    console.log('📂 读取Excel文件:', excelFilePath);
    
    const workbook = XLSX.readFile(excelFilePath);
    const phoneData = {};
    const chartDatasets = [];
    const chartLabels = ['13mm', '24mm', '35mm', '50mm', '77mm', '120mm', '200mm'];
    
    // 遍历每个品牌工作表
    workbook.SheetNames.forEach(sheetName => {
      if (!BRAND_MAPPING[sheetName]) {
        console.log(`⚠️  跳过未知工作表: ${sheetName}`);
        return;
      }
      
      console.log(`🔍 处理工作表: ${sheetName}`);
      
      const brandKey = BRAND_MAPPING[sheetName];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);
      
      if (rawData.length === 0) {
        console.log(`⚠️  工作表 ${sheetName} 为空，跳过`);
        return;
      }
      
      // 处理手机基本信息
      phoneData[brandKey] = rawData.map(row => ({
        name: row['名称'] || '',
        releaseDate: row['发布日期'] || '',
        level: row['级别'] || '',
        // 超广角信息
        ultraWide: {
          sensor: row['超广角传感器型号'] || '',
          sensorSize: row['超广角传感器尺寸（英寸）'] || '',
          focalLength: row['超广角等效焦距（mm）'] || '',
          aperture: row['超广角光圈（F）'] || '',
          equivalentAperture: row['超广角等效光圈（F）'] || ''
        },
        // 主摄信息
        main: {
          sensor: row['主摄传感器型号'] || '',
          sensorSize: row['主摄传感器尺寸（英寸）'] || '',
          focalLength: row['主摄等效焦距（mm）'] || '',
          aperture: row['主摄光圈（F）'] || '',
          equivalentAperture: row['主摄等效光圈（F）'] || ''
        },
        // 长焦信息
        telephoto: {
          sensor: row['长焦传感器型号'] || '',
          sensorSize: row['长焦传感器尺寸（英寸）'] || '',
          focalLength: row['长焦等效焦距（mm）'] || '',
          aperture: row['长焦光圈（F）'] || '',
          equivalentAperture: row['长焦等效光圈（F）'] || ''
        },
        // 超长焦信息
        superTelephoto: {
          sensor: row['超长焦传感器型号'] || '',
          sensorSize: row['超长焦传感器尺寸（英寸）'] || '',
          focalLength: row['超长焦等效焦距（mm）'] || '',
          aperture: row['超长焦光圈（F）'] || '',
          equivalentAperture: row['超长焦等效光圈（F）'] || ''
        }
      }));
      
      // 为每台手机生成图表数据
      rawData.forEach((row, index) => {
        const phoneName = row['名称'];
        if (!phoneName) return;
        
        // 生成等效光圈曲线数据
        const apertureData = generateApertureCurve(row);
        
        const colors = BRAND_COLORS[brandKey] || ['#666666'];
        const colorIndex = index % colors.length;
        
        chartDatasets.push({
          label: phoneName,
          data: apertureData,
          borderColor: colors[colorIndex],
          backgroundColor: generateBackgroundColor(colors[colorIndex]),
          tension: 0.4,
          brand: brandKey
        });
      });
      
      console.log(`✅ ${sheetName}: 处理了 ${rawData.length} 台设备`);
    });
    
    // 输出文件
    const outputDir = './data';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 输出手机数据
    fs.writeFileSync(
      path.join(outputDir, 'phones-real-data.json'),
      JSON.stringify(phoneData, null, 2),
      'utf8'
    );
    console.log('✅ 手机数据已保存到 phones-real-data.json');
    
    // 输出图表数据
    const chartData = {
      labels: chartLabels,
      datasets: chartDatasets
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'chart-real-data.json'),
      JSON.stringify(chartData, null, 2),
      'utf8'
    );
    console.log('✅ 图表数据已保存到 chart-real-data.json');
    
    // 生成TypeScript接口
    generateTypeDefinitions(outputDir);
    
    // 生成数据统计
    generateDataStats(phoneData, chartDatasets);
    
    console.log('🎉 数据转换完成！');
    
  } catch (error) {
    console.error('❌ 转换失败:', error.message);
    console.error(error.stack);
  }
}

/** * 根据手机摄像头数据生成等效光圈曲线 */function generateApertureCurve(phoneRow) {  // 提取各个镜头的焦距和等效光圈  const lenses = [];    // 辅助函数：解析光圈值  function parseAperture(apertureStr) {    if (!apertureStr) return null;        // 处理 "f/10.6" 格式    if (typeof apertureStr === 'string') {      const match = apertureStr.match(/f?\/?([\d.]+)/);      if (match) {        return parseFloat(match[1]);      }    }        // 处理数字类型    if (typeof apertureStr === 'number') {      return apertureStr;    }        return null;  }    // 超广角  const ultraWideFocal = phoneRow['超广角等效焦距（mm）'];  const ultraWideAperture = parseAperture(phoneRow['超广角等效光圈（F）']);  if (ultraWideFocal && ultraWideAperture) {    lenses.push({      focalLength: parseFloat(ultraWideFocal),      aperture: ultraWideAperture    });  }    // 主摄  const mainFocal = phoneRow['主摄等效焦距（mm）'];  const mainAperture = parseAperture(phoneRow['主摄等效光圈（F）']);  if (mainFocal && mainAperture) {    lenses.push({      focalLength: parseFloat(mainFocal),      aperture: mainAperture    });  }    // 长焦  const telephotoFocal = phoneRow['长焦等效焦距（mm）'];  const telephotoAperture = parseAperture(phoneRow['长焦等效光圈（F）']);  if (telephotoFocal && telephotoAperture) {    lenses.push({      focalLength: parseFloat(telephotoFocal),      aperture: telephotoAperture    });  }    // 超长焦  const superTelephotoFocal = phoneRow['超长焦等效焦距（mm）'];  const superTelephotoAperture = parseAperture(phoneRow['超长焦等效光圈（F）']);  if (superTelephotoFocal && superTelephotoAperture) {    lenses.push({      focalLength: parseFloat(superTelephotoFocal),      aperture: superTelephotoAperture    });  }
  
  // 目标焦距点
  const targetFocalLengths = [13, 24, 35, 50, 77, 120, 200];
  
  // 为每个目标焦距插值计算等效光圈
  return targetFocalLengths.map(targetFL => {
    if (lenses.length === 0) return null;
    
    // 找到最接近的镜头或进行插值
    const sorted = lenses.sort((a, b) => a.focalLength - b.focalLength);
    
    // 如果目标焦距小于最小焦距，使用最小焦距的光圈
    if (targetFL <= sorted[0].focalLength) {
      return sorted[0].aperture;
    }
    
    // 如果目标焦距大于最大焦距，使用最大焦距的光圈
    if (targetFL >= sorted[sorted.length - 1].focalLength) {
      return sorted[sorted.length - 1].aperture;
    }
    
    // 在中间进行线性插值
    for (let i = 0; i < sorted.length - 1; i++) {
      const lens1 = sorted[i];
      const lens2 = sorted[i + 1];
      
      if (targetFL >= lens1.focalLength && targetFL <= lens2.focalLength) {
        // 线性插值
        const ratio = (targetFL - lens1.focalLength) / (lens2.focalLength - lens1.focalLength);
        return lens1.aperture + ratio * (lens2.aperture - lens1.aperture);
      }
    }
    
    return null;
  });
}

function generateBackgroundColor(borderColor) {
  if (!borderColor) return 'rgba(0, 0, 0, 0.1)';
  
  const hex = borderColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
}

function generateTypeDefinitions(outputDir) {
  const typeDefinitions = `
export interface CameraLens {
  sensor: string;
  sensorSize: string;
  focalLength: string;
  aperture: string;
  equivalentAperture: string;
}

export interface PhoneData {
  name: string;
  releaseDate: string;
  level: string;
  ultraWide: CameraLens;
  main: CameraLens;
  telephoto: CameraLens;
  superTelephoto: CameraLens;
}

export interface ChartDataset {
  label: string;
  data: (number | null)[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
  brand: string;
}

export interface PhoneBrandData {
  [brand: string]: PhoneData[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}
`;

  fs.writeFileSync(
    path.join(outputDir, 'phone-types.ts'),
    typeDefinitions,
    'utf8'
  );
  console.log('✅ TypeScript类型定义已生成 phone-types.ts');
}

function generateDataStats(phoneData, chartDatasets) {
  console.log('\n📊 数据统计:');
  console.log('==================');
  
  Object.keys(phoneData).forEach(brand => {
    const count = phoneData[brand].length;
    console.log(`${brand.toUpperCase()}: ${count} 台设备`);
  });
  
  console.log(`\n📈 图表数据集: ${chartDatasets.length} 条曲线`);
  console.log('==================');
}

// 执行转换
const excelFile = './data/各机型后置摄像头数据.xlsx';

if (!fs.existsSync(excelFile)) {
  console.error(`❌ 文件不存在: ${excelFile}`);
  process.exit(1);
}

convertPhoneData(excelFile); 