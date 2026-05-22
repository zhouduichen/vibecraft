export interface Skill {
  id: string;
  name: string;
  description: string;
  prompt: string;
  compatibleTemplates: string[];
}

export const SKILLS: Record<string, Skill> = {
  chart: {
    id: 'chart',
    name: '消费图表',
    description: '饼图和月度趋势折线图',
    prompt: `【必须实现：消费图表】

1. 在 <head> 中新增 Chart.js CDN：
   <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
   Chart.js 加载后全局可用 window.Chart。

2. 从当前 React state 中读取数据（自行阅读源码确定 state 字段名和结构），在页面中增加一个图表区，包含：
   - 一个饼图：按分类汇总金额
   - 一个月度趋势折线图：按月份汇总
   使用 <canvas> 渲染，useEffect 中 new Chart(ctx, {...}) 初始化，依赖数组包含数据源。

3. 图表容器使用 Tailwind CSS 做响应式布局。图表配置中：
   - 深色主题适配：文字色用 rgba(255,255,255,0.7)，网格线用 rgba(255,255,255,0.1)
   - 圆角曲线 tension: 0.3
   - 饼图使用 Canvas 渲染不要 SVG`,
    compatibleTemplates: ['ledger', 'checkin', '*'],
  },
  export_excel: {
    id: 'export_excel',
    name: '导出 Excel',
    description: '将数据导出为 Excel 文件',
    prompt: `【必须实现：导出 Excel】

1. 在 <head> 中新增 SheetJS CDN（放在其他 <script> 之前）：
   <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
   加载后全局可用 window.XLSX。

2. 在 JSX 中新增一个"导出 Excel"按钮。点击时：
   a. 从当前 React state 中读取数据（自行阅读源码确定 state 字段名和结构）
   b. 将数据转为对象数组，每个对象的 key 为中文列名
   c. 调用 XLSX.utils.json_to_sheet(dataArray) 生成工作表
   d. 调用 XLSX.utils.book_new() 创建工作簿，XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
   e. 调用 XLSX.writeFile(wb, "export.xlsx") 触发下载

3. 按钮样式与当前应用风格一致，导出过程中显示 loading 态。

4. 注意：XLSX 挂在 window 上，在 Babel JSX 中直接用 XLSX（全局变量），不需要 import。`,
    compatibleTemplates: ['ledger', 'checkin', 'todo', '*'],
  },
  budget_alert: {
    id: 'budget_alert',
    name: '超支弹窗',
    description: '超出预算时弹出警告',
    prompt: `【必须实现：超支预警】

1. 在 React state 中新增一个 budget 字段，默认值为一个分类预算对象，如：
   { '餐饮': 2000, '交通': 500, '购物': 1000, '娱乐': 500, '居住': 3000, '医疗': 1000, '教育': 1000, '其他': 500 }
   同时持久化到 localStorage。

2. 每次记账数据变更后，计算各分类当月支出总额。若某分类超过预算阈值，在页面顶部显示警告条：
   - 展示：分类名 + 预算金额 + 实际支出 + 超出金额
   - 使用黄色/橙色背景，有醒目的图标
   - 有关闭按钮，关闭后当天不再显示（日期存 localStorage）

3. 在设置区增加预算编辑入口，允许用户修改各分类预算值。

4. 警告条用内联方式展示，不要用浏览器 alert() 弹窗。`,
    compatibleTemplates: ['ledger'],
  },
};
