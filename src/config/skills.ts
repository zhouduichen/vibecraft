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
    prompt: `在页面顶部添加一个支出分类饼图和一个月度趋势折线图。
引入 Chart.js CDN: <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
图表使用 <canvas> 元素渲染，数据从当前 state 的 records 中读取。`,
    compatibleTemplates: ['ledger', 'checkin', '*'],
  },
  export_excel: {
    id: 'export_excel',
    name: '导出 Excel',
    description: '将数据导出为 Excel 文件',
    prompt: `添加一个"导出 Excel"按钮。
引入 SheetJS CDN: <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
点击按钮时将当前数据导出为 .xlsx 文件并触发下载。`,
    compatibleTemplates: ['ledger', 'checkin', 'todo', '*'],
  },
  budget_alert: {
    id: 'budget_alert',
    name: '超支弹窗',
    description: '超出预算时弹出警告',
    prompt: `当某分类支出超过预算阈值时，在页面顶部显示红色警告弹窗。
弹窗包含：超支分类名称、预算金额、实际支出、超出金额。
弹窗有关闭按钮，关闭后当天不再显示。`,
    compatibleTemplates: ['ledger'],
  },
};
