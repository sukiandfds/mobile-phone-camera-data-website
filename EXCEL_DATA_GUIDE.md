# 📊 Excel数据管理指南

## 🎯 三种加载方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **JSON转换** | 性能最好、类型安全 | 数据更新需重新转换 | 数据相对固定 |
| **动态加载** | 实时更新、灵活性强 | 首次加载稍慢 | 数据经常更新 |
| **CSV方式** | 体积小、易编辑 | 结构相对简单 | 简单数据结构 |

## 🚀 推荐使用流程

### 方案1：Excel → JSON（推荐）

1. **准备Excel文件**
   ```
   📁 data/
   └── 手机数据.xlsx
       ├── 手机基本信息 (Sheet1)
       ├── 图表数据 (Sheet2)
       └── 焦段数据 (Sheet3)
   ```

2. **运行转换命令**
   ```bash
   # 转换Excel为JSON
   node scripts/excel-to-json.js ./data/手机数据.xlsx
   
   # 检查生成的文件
   ls ./data/*.json
   ```

3. **集成到网站**
   ```typescript
   // 在组件中导入
   import phoneData from '../data/phones-data.json';
   import chartData from '../data/chart-data.json';
   ```

### 方案2：动态Excel加载

1. **上传Excel文件到public目录**
   ```
   📁 public/
   └── data/
       └── phones.xlsx
   ```

2. **在组件中使用**
   ```typescript
   import { useExcelData } from '../lib/excel-loader';
   
   function MyComponent() {
     const { data, loading, error } = useExcelData('/data/phones.xlsx');
     
     if (loading) return <div>加载中...</div>;
     if (error) return <div>错误: {error}</div>;
     
     return <div>{/* 使用data */}</div>;
   }
   ```

3. **文件上传功能**
   ```typescript
   function DataUploader() {
     const { loadData } = useExcelData();
     
     const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
       const file = event.target.files?.[0];
       if (file) {
         loadData(file);
       }
     };
     
     return <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />;
   }
   ```

## 📋 Excel数据格式规范

### 表格1：手机基本信息
- **必填列**：品牌、型号、发布时间、光圈范围、焦段范围
- **可选列**：主摄、超广角、长焦、其他规格

### 表格2：图表数据  
- **必填列**：机型、各焦段光圈值（13mm-200mm）
- **可选列**：颜色（16进制色码）

### 表格3：焦段数据（可选）
- **列名**：焦段、标签、描述

## 🔧 数据更新工作流

### 定期更新（推荐）
```bash
# 1. 更新Excel文件
# 2. 重新转换
npm run convert-excel

# 3. 提交到版本控制
git add data/*.json
git commit -m "更新手机数据"

# 4. 部署
npm run build
npm run deploy
```

### 实时更新
```bash
# 1. 直接替换public/data/phones.xlsx
# 2. 网站自动重新加载数据
```

## ⚡ 性能优化建议

1. **大数据集处理**
   - 使用分页加载
   - 实现虚拟滚动
   - 数据懒加载

2. **缓存策略**
   ```typescript
   // 本地存储缓存
   const cacheKey = `phone-data-${Date.now()}`;
   localStorage.setItem(cacheKey, JSON.stringify(data));
   ```

3. **压缩优化**
   ```bash
   # 压缩JSON文件
   npm install -g json-minify
   json-minify data/phones-data.json > data/phones-data.min.json
   ```

## 🛠️ 故障排除

### 常见问题

1. **Excel文件无法解析**
   - 检查文件格式（.xlsx/.xls）
   - 确认表格名称包含关键词
   - 验证数据列名正确

2. **数据显示异常**
   - 检查数据类型（数字vs文本）
   - 确认颜色格式（#RRGGBB）
   - 验证必填字段完整

3. **性能问题**
   - 减少数据量
   - 使用数据分页
   - 启用缓存机制

### 调试命令
```bash
# 检查Excel文件结构
node -e "
const XLSX = require('xlsx');
const wb = XLSX.readFile('./data/手机数据.xlsx');
console.log('表格列表:', wb.SheetNames);
"

# 验证JSON数据
node -e "
const data = require('./data/phones-data.json');
console.log('数据统计:', Object.keys(data).map(brand => \`\${brand}: \${data[brand].length}台\`));
"
``` 