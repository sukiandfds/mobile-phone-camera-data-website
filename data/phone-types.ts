
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
