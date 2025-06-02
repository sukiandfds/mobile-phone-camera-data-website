const XLSX = require('xlsx');
const fs = require('fs');

/**
 * 增强版Excel数据转换脚本
 * 支持12个焦段和详细传感器信息
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
    // 尝试匹配 "f/1.8", "F1.8", "1.8" 等格式
    const match = apertureStr.toString().match(/f?\/?([\d.]+)/i);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
  }
  
  if (typeof apertureStr === 'number') {
    return apertureStr;
  }
  console.warn(`[parseAperture] 无法解析光圈值: ${apertureStr}`);
  return null;
}

// 生成等效光圈曲线和详细信息
function generateApertureCurveWithDetails(phoneRow) {
  console.log(`  🔍 正在处理设备: ${phoneRow['名称']}`);
  const lenses = [];
  const lensDetails = {};
  
  // 收集所有镜头数据
  const ultraWideFocal = phoneRow['超广角等效焦距（mm）'];
  const ultraWideEqAperture = parseAperture(phoneRow['超广角等效光圈（F）']); // 等效光圈 Y值
  const ultraWidePhysicalApertureStr = phoneRow['超广角光圈（F）'];
  const ultraWidePhysicalApertureVal = parseAperture(ultraWidePhysicalApertureStr);
  const ultraWideConversionFactor = parseFloat(phoneRow['超广角转换系数']);
  
  if (ultraWideFocal && ultraWideEqAperture) {
    console.log(`    超广角: ${ultraWideFocal}mm, EqAp F${ultraWideEqAperture}, PhysAp F${ultraWidePhysicalApertureVal}, CF ${ultraWideConversionFactor}`);
    lenses.push({
      focalLength: parseFloat(ultraWideFocal),
      aperture: ultraWideEqAperture,
      type: 'ultraWide',
      physicalApertureValue: !isNaN(ultraWidePhysicalApertureVal) ? ultraWidePhysicalApertureVal : null,
      conversionFactor: !isNaN(ultraWideConversionFactor) ? ultraWideConversionFactor : null,
    });
    lensDetails[ultraWideFocal] = {
      sensor: phoneRow['超广角传感器型号'] || '',
      sensorSize: phoneRow['超广角传感器尺寸（英寸）'] || '',
      physicalFocalLength: phoneRow['超广角物理焦距（mm）'] || '',
      equivalentFocalLength: ultraWideFocal,
      aperture: ultraWidePhysicalApertureStr || '', // 保留原始物理光圈字符串
      equivalentAperture: phoneRow['超广角等效光圈（F）'] || ''
    };
  }
  
  const mainFocal = phoneRow['主摄等效焦距（mm）'];
  const mainEqAperture = parseAperture(phoneRow['主摄等效光圈（F）']);
  const mainPhysicalApertureStr = phoneRow['主摄光圈（F）'];
  const mainPhysicalApertureVal = parseAperture(mainPhysicalApertureStr);
  const mainConversionFactor = parseFloat(phoneRow['主摄转换系数']);

  if (mainFocal && mainEqAperture) {
    console.log(`    主摄: ${mainFocal}mm, EqAp F${mainEqAperture}, PhysAp F${mainPhysicalApertureVal}, CF ${mainConversionFactor}`);
    lenses.push({
      focalLength: parseFloat(mainFocal),
      aperture: mainEqAperture,
      type: 'main',
      physicalApertureValue: !isNaN(mainPhysicalApertureVal) ? mainPhysicalApertureVal : null,
      conversionFactor: !isNaN(mainConversionFactor) ? mainConversionFactor : null,
    });
    lensDetails[mainFocal] = {
      sensor: phoneRow['主摄传感器型号'] || '',
      sensorSize: phoneRow['主摄传感器尺寸（英寸）'] || '',
      physicalFocalLength: phoneRow['主摄物理焦距（mm）'] || '',
      equivalentFocalLength: mainFocal,
      aperture: mainPhysicalApertureStr || '',
      equivalentAperture: phoneRow['主摄等效光圈（F）'] || ''
    };
  }
  
  const telephotoFocal = phoneRow['长焦等效焦距（mm）'];
  const telephotoEqAperture = parseAperture(phoneRow['长焦等效光圈（F）']);
  const telephotoPhysicalApertureStr = phoneRow['长焦光圈（F）'];
  const telephotoPhysicalApertureVal = parseAperture(telephotoPhysicalApertureStr);
  const telephotoConversionFactor = parseFloat(phoneRow['长焦转换系数']);

  if (telephotoFocal && telephotoEqAperture) {
    console.log(`    长焦: ${telephotoFocal}mm, EqAp F${telephotoEqAperture}, PhysAp F${telephotoPhysicalApertureVal}, CF ${telephotoConversionFactor}`);
    lenses.push({
      focalLength: parseFloat(telephotoFocal),
      aperture: telephotoEqAperture,
      type: 'telephoto',
      physicalApertureValue: !isNaN(telephotoPhysicalApertureVal) ? telephotoPhysicalApertureVal : null,
      conversionFactor: !isNaN(telephotoConversionFactor) ? telephotoConversionFactor : null,
    });
    lensDetails[telephotoFocal] = {
      sensor: phoneRow['长焦传感器型号'] || '',
      sensorSize: phoneRow['长焦传感器尺寸（英寸）'] || '',
      physicalFocalLength: phoneRow['长焦物理焦距（mm）'] || '',
      equivalentFocalLength: telephotoFocal,
      aperture: telephotoPhysicalApertureStr || '',
      equivalentAperture: phoneRow['长焦等效光圈（F）'] || ''
    };
  }
  
  const superTelephotoFocal = phoneRow['超长焦等效焦距（mm）'];
  const superTelephotoEqAperture = parseAperture(phoneRow['超长焦等效光圈（F）']);
  const superTelephotoPhysicalApertureStr = phoneRow['超长焦光圈（F）'];
  const superTelephotoPhysicalApertureVal = parseAperture(superTelephotoPhysicalApertureStr);
  const superTelephotoConversionFactor = parseFloat(phoneRow['超长焦转换系数']);

  if (superTelephotoFocal && superTelephotoEqAperture) {
    console.log(`    超长焦: ${superTelephotoFocal}mm, EqAp F${superTelephotoEqAperture}, PhysAp F${superTelephotoPhysicalApertureVal}, CF ${superTelephotoConversionFactor}`);
    lenses.push({
      focalLength: parseFloat(superTelephotoFocal),
      aperture: superTelephotoEqAperture,
      type: 'superTelephoto',
      physicalApertureValue: !isNaN(superTelephotoPhysicalApertureVal) ? superTelephotoPhysicalApertureVal : null,
      conversionFactor: !isNaN(superTelephotoConversionFactor) ? superTelephotoConversionFactor : null,
    });
    lensDetails[superTelephotoFocal] = {
      sensor: phoneRow['超长焦传感器型号'] || '',
      sensorSize: phoneRow['超长焦传感器尺寸（英寸）'] || '',
      physicalFocalLength: phoneRow['超长焦物理焦距（mm）'] || '',
      equivalentFocalLength: superTelephotoFocal,
      aperture: superTelephotoPhysicalApertureStr || '',
      equivalentAperture: phoneRow['超长焦等效光圈（F）'] || ''
    };
  }
  
  // 目标焦距点（12个焦段） - 这部分逻辑生成的 apertureData 不再直接用于前端绘图
  // const targetFocalLengths = [13, 16, 24, 28, 35, 50, 75, 85, 105, 120, 135, 200];
  // const apertureData = targetFocalLengths.map(targetFL => { ... }); // 旧的插值逻辑
  
  if (lenses.length > 0) {
    console.log(`    [${phoneRow['名称']}] lenses 数组首个元素示例: `, lenses[0]);
  }

  return {
    data: [], // 不再使用旧的插值数据
    lensDetails: lensDetails,
    originalLenses: lenses.sort((a, b) => a.focalLength - b.focalLength) // 确保按焦距排序
  };
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
      level: row['级别'] || '',
      // 解析发布年份
      releaseYear: extractYear(row['发布日期'] || ''),
    }));
    
    rawData.forEach((row, index) => {
      const phoneName = row['名称'];
      if (!phoneName) return;
      
      console.log(`\n--- 开始处理: ${phoneName} (行号 ${index + 2} in sheet ${sheetName}) ---`);
      const result = generateApertureCurveWithDetails(row);
      
      const colors = BRAND_COLORS[brandKey] || ['#666666'];
      const colorIndex = index % colors.length;
      
      chartDatasets.push({
        label: phoneName,
        data: result.data,
        borderColor: colors[colorIndex],
        backgroundColor: `rgba(${parseInt(colors[colorIndex].slice(1, 3), 16)}, ${parseInt(colors[colorIndex].slice(3, 5), 16)}, ${parseInt(colors[colorIndex].slice(5, 7), 16)}, 0.1)`,
        tension: 0.4,
        brand: brandKey,
        releaseYear: extractYear(row['发布日期'] || ''),
        lensDetails: result.lensDetails,
        originalLenses: result.originalLenses
      });
    });
    
    console.log(`✅ ${sheetName}: 处理了 ${rawData.length} 台设备`);
  });
  
  // 保存数据
  fs.writeFileSync('./data/phones-enhanced.json', JSON.stringify(phoneData, null, 2));
  console.log('\n💾 phones-enhanced.json 已保存.');
  
  const chartData = {
    labels: ['12mm', '16mm', '24mm', '28mm', '35mm', '50mm', '75mm', '85mm', '105mm', '120mm', '135mm', '200mm'], // 保持原样，前端X轴标签会用
    datasets: chartDatasets
  };
  
  fs.writeFileSync('./data/chart-enhanced.json', JSON.stringify(chartData, null, 2));
  console.log('💾 chart-enhanced.json 已保存.');
  
  console.log('\n🎉 转换完成！');
  console.log(`📊 总计处理了 ${chartDatasets.length} 条曲线 (设备)`);
  
  // 生成发布年份统计
  const yearStats = {};
  chartDatasets.forEach(dataset => {
    const year = dataset.releaseYear;
    if (year) {
      yearStats[year] = (yearStats[year] || 0) + 1;
    }
  });
  
  console.log('📅 发布年份统计:', yearStats);
}

// 解析发布年份
function extractYear(dateStr) {
  if (!dateStr) return null;
  
  // 如果是Date对象，直接获取年份
  if (dateStr instanceof Date) {
    return dateStr.getFullYear();
  }
  
  // 如果是数字（Excel日期序列号），转换为Date对象
  if (typeof dateStr === 'number') {
    // Excel日期从1900年1月1日开始计算，需要转换
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (dateStr - 1) * 24 * 60 * 60 * 1000);
    return date.getFullYear();
  }
  
  // 如果是字符串，尝试匹配年份
  if (typeof dateStr === 'string') {
    const yearMatch = dateStr.match(/(\d{4})/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
  }
  
  console.warn(`[extractYear] 无法解析日期格式: ${dateStr} (类型: ${typeof dateStr})`);
  return null;
}

// 运行转换
convertPhoneData(); 