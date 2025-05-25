export interface PhoneData {
  name: string;
  releaseDate: string;
  aperture: string;
  focalLength: string;
}

export interface ChartDataPoint {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  tension: number;
}

// 手机数据
export const phoneData = {
  xiaomi: [
    { 
      name: '小米15 Ultra', 
      releaseDate: '2025年2月27日', 
      aperture: 'f/1.8-f/4.0', 
      focalLength: '13-120mm' 
    },
    { 
      name: '小米14 Ultra', 
      releaseDate: '2024年2月22日', 
      aperture: 'f/1.63-f/4.0', 
      focalLength: '12-120mm' 
    },
    { 
      name: '小米13 Ultra', 
      releaseDate: '2023年4月18日', 
      aperture: 'f/1.9-f/4.0', 
      focalLength: '12-120mm' 
    },
    { 
      name: '小米12S Ultra', 
      releaseDate: '2022年7月4日', 
      aperture: 'f/1.9-f/4.0', 
      focalLength: '13-120mm' 
    },
    { 
      name: '小米11 Ultra', 
      releaseDate: '2021年3月29日', 
      aperture: 'f/1.95-f/4.1', 
      focalLength: '13-120mm' 
    },
  ] as PhoneData[],
  
  samsung: [
    { 
      name: '三星Galaxy S24 Ultra', 
      releaseDate: '2024年1月17日', 
      aperture: 'f/1.7-f/3.4', 
      focalLength: '13-230mm' 
    },
    { 
      name: '三星Galaxy S23 Ultra', 
      releaseDate: '2023年2月1日', 
      aperture: 'f/1.7-f/3.5', 
      focalLength: '13-230mm' 
    },
    { 
      name: '三星Galaxy S22 Ultra', 
      releaseDate: '2022年2月9日', 
      aperture: 'f/1.8-f/2.4', 
      focalLength: '13-230mm' 
    },
    { 
      name: '三星Galaxy S21 Ultra', 
      releaseDate: '2021年1月14日', 
      aperture: 'f/1.8-f/2.4', 
      focalLength: '13-230mm' 
    },
    { 
      name: '三星Galaxy Note20 Ultra', 
      releaseDate: '2020年8月5日', 
      aperture: 'f/1.8-f/3.0', 
      focalLength: '13-120mm' 
    },
  ] as PhoneData[],
  
  apple: [
    { 
      name: 'iPhone 15 Pro Max', 
      releaseDate: '2023年9月22日', 
      aperture: 'f/1.78-f/2.8', 
      focalLength: '13-120mm' 
    },
    { 
      name: 'iPhone 14 Pro Max', 
      releaseDate: '2022年9月16日', 
      aperture: 'f/1.78-f/2.8', 
      focalLength: '13-77mm' 
    },
    { 
      name: 'iPhone 13 Pro Max', 
      releaseDate: '2021年9月24日', 
      aperture: 'f/1.5-f/2.8', 
      focalLength: '13-77mm' 
    },
    { 
      name: 'iPhone 12 Pro Max', 
      releaseDate: '2020年11月13日', 
      aperture: 'f/1.6-f/2.2', 
      focalLength: '13-65mm' 
    },
  ] as PhoneData[],
  
  huawei: [
    { 
      name: '华为Mate 60 Pro+', 
      releaseDate: '2023年9月12日', 
      aperture: 'f/1.4-f/3.0', 
      focalLength: '13-125mm' 
    },
    { 
      name: '华为P60 Pro', 
      releaseDate: '2023年3月23日', 
      aperture: 'f/1.4-f/3.5', 
      focalLength: '13-125mm' 
    },
    { 
      name: '华为Mate 50 Pro', 
      releaseDate: '2022年9月6日', 
      aperture: 'f/1.4-f/3.5', 
      focalLength: '13-125mm' 
    },
  ] as PhoneData[],
  
  oppo: [
    { 
      name: 'OPPO Find X7 Ultra', 
      releaseDate: '2024年1月8日', 
      aperture: 'f/1.8-f/4.3', 
      focalLength: '14-270mm' 
    },
    { 
      name: 'OPPO Find X6 Pro', 
      releaseDate: '2023年3月21日', 
      aperture: 'f/1.8-f/2.6', 
      focalLength: '14-110mm' 
    },
  ] as PhoneData[],
  
  vivo: [
    { 
      name: 'vivo X100 Pro+', 
      releaseDate: '2024年5月13日', 
      aperture: 'f/1.75-f/4.3', 
      focalLength: '14-200mm' 
    },
    { 
      name: 'vivo X90 Pro+', 
      releaseDate: '2022年11月22日', 
      aperture: 'f/1.75-f/3.5', 
      focalLength: '14-90mm' 
    },
  ] as PhoneData[],
};

// 图表数据
export const chartDatasets: ChartDataPoint[] = [
  // 这里可以添加具体的图表数据点，暂时留空
];