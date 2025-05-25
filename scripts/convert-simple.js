const XLSX = require('xlsx');
const fs = require('fs');

/**
 * 简化版Excel数据转换脚本
 */

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

// 解析光圈值
function parseAperture(apertureStr) {
  if (!apertureStr) return null;
  
  if (typeof apertureStr === 'string') {
    const match = apertureStr.match(/f?\/?([\d.]+)/);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  if (typeof apertureStr === 'number') {
    return apertureStr;
  }
  
  return null;
}

// 生成等效光圈曲线
function generateApertureCurve(phoneRow) {
  const lenses = [];
  
  // 收集所有镜头数据
  const ultraWideFocal = phoneRow['超广角等效焦距（mm）'];
  const ultraWideAperture = parseAperture(phoneRow['超广角等效光圈（F）']);
  if (ultraWideFocal && ultraWideAperture) {
    lenses.push({
      focalLength: parseFloat(ultraWideFocal),
      aperture: ultraWideAperture
    });
  }
  
  const mainFocal = phoneRow['主摄等效焦距（mm）'];
  const mainAperture = parseAperture(phoneRow['主摄等效光圈（F）']);
  if (mainFocal && mainAperture) {
    lenses.push({
      focalLength: parseFloat(mainFocal),
      aperture: mainAperture
    });
  }
  
  const telephotoFocal = phoneRow['长焦等效焦距（mm）'];
  const telephotoAperture = parseAperture(phoneRow['长焦等效光圈（F）']);
  if (telephotoFocal && telephotoAperture) {
    lenses.push({
      focalLength: parseFloat(telephotoFocal),
      aperture: telephotoAperture
    });
  }
  
  const superTelephotoFocal = phoneRow['超长焦等效焦距（mm）'];
  const superTelephotoAperture = parseAperture(phoneRow['超长焦等效光圈（F）']);
  if (superTelephotoFocal && superTelephotoAperture) {
    lenses.push({
      focalLength: parseFloat(superTelephotoFocal),
      aperture: superTelephotoAperture
    });
  }
  
  console.log(`${phoneRow['名称']} 镜头数据:`, lenses);
  
    // 目标焦距点  const targetFocalLengths = [13, 16, 24, 28, 35, 50, 75, 85, 105, 120, 135, 200];
  
  // 为每个目标焦距插值计算等效光圈
  return targetFocalLengths.map(targetFL => {
    if (lenses.length === 0) return null;
    
    // 排序镜头数据
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
        const ratio = (targetFL - lens1.focalLength) / (lens2.focalLength - lens1.focalLength);
        return lens1.aperture + ratio * (lens2.aperture - lens1.aperture);
      }
    }
    
    return null;
  });
}

// 主转换函数
function convertPhoneData() {
  console.log('📂 开始转换Excel数据...');
  
  const workbook = XLSX.readFile('./data/各机型后置摄像头数据.xlsx');
  const phoneData = {};
  const chartDatasets = [];
  
  const brandMapping = {
    '小米机型': 'xiaomi',
    'VIVO机型': 'vivo',
    'OPPO机型': 'oppo',
    '苹果机型': 'apple',
    '三星机型': 'samsung',
    '华为机型': 'huawei',
    '荣耀机型': 'honor',
    '努比亚机型': 'nubia'
  };
  
  workbook.SheetNames.forEach(sheetName => {
    const brandKey = brandMapping[sheetName];
    if (!brandKey) return;
    
    console.log(`🔍 处理工作表: ${sheetName}`);
    
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    phoneData[brandKey] = rawData.map(row => ({
      name: row['名称'] || '',
      releaseDate: row['发布日期'] || '',
      level: row['级别'] || ''
    }));
    
    rawData.forEach((row, index) => {
      const phoneName = row['名称'];
      if (!phoneName) return;
      
      const apertureData = generateApertureCurve(row);
      
      const colors = BRAND_COLORS[brandKey] || ['#666666'];
      const colorIndex = index % colors.length;
      
      chartDatasets.push({
        label: phoneName,
        data: apertureData,
        borderColor: colors[colorIndex],
        backgroundColor: `rgba(${parseInt(colors[colorIndex].slice(1, 3), 16)}, ${parseInt(colors[colorIndex].slice(3, 5), 16)}, ${parseInt(colors[colorIndex].slice(5, 7), 16)}, 0.1)`,
        tension: 0.4,
        brand: brandKey
      });
    });
    
    console.log(`✅ ${sheetName}: 处理了 ${rawData.length} 台设备`);
  });
  
  // 保存数据
  fs.writeFileSync('./data/phones-simple.json', JSON.stringify(phoneData, null, 2));
  
    const chartData = {    labels: ['13mm', '16mm', '24mm', '28mm', '35mm', '50mm', '75mm', '85mm', '105mm', '120mm', '135mm', '200mm'],    datasets: chartDatasets  };
  
  fs.writeFileSync('./data/chart-simple.json', JSON.stringify(chartData, null, 2));
  
  console.log('🎉 转换完成！');
  console.log(`📊 总计处理了 ${chartDatasets.length} 条曲线`);
}

// 运行转换
convertPhoneData(); 