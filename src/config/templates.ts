export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  cover_url: string;
  html: string;
  tags: string[];
  compatibleSkills: string[];
}

function iconDataUri(icon: string, bgColor: string, size: number): string {
  const radius = Math.round(size * 0.17);
  const fontSize = Math.round(size * 0.5);
  const y = Math.round(size * 0.66);
  const center = size / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${bgColor}"/><text x="${center}" y="${y}" text-anchor="middle" font-size="${fontSize}">${icon}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function manifestDataUri(name: string, shortName: string, themeColor: string, icon: string): string {
  const manifest = {
    name,
    short_name: shortName,
    start_url: '.',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: themeColor,
    icons: [
      { src: iconDataUri(icon, themeColor, 192), sizes: '192x192', type: 'image/svg+xml' },
      { src: iconDataUri(icon, themeColor, 512), sizes: '512x512', type: 'image/svg+xml' },
    ],
  };
  return `data:application/json,${encodeURIComponent(JSON.stringify(manifest))}`;
}

function ledgerHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="manifest" href="${manifestDataUri('极简记账本', '记账本', '#6366f1', '💰')}">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .app-container { max-width: 480px; margin: 0 auto; min-height: 100vh; }
    input, select, button { font-size: 16px; }
  </style>
  <title>极简记账本</title>
</head>
<body class="bg-slate-950">
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useCallback } = React;
    const STORAGE_KEY = 'vibecraft_ledger_data';
    const CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '居住', '医疗', '教育', '其他'];
    const CATEGORY_COLORS = {
      '餐饮': '#f97316', '交通': '#3b82f6', '购物': '#ec4899', '娱乐': '#8b5cf6',
      '居住': '#10b981', '医疗': '#ef4444', '教育': '#6366f1', '其他': '#6b7280'
    };

    function App() {
      const [records, setRecords] = useState(() => {
        try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : []; }
        catch { return []; }
      });
      const [showForm, setShowForm] = useState(false);
      const [filterType, setFilterType] = useState('all');
      const [form, setForm] = useState({ type: 'expense', amount: '', category: '餐饮', note: '' });

      useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }, [records]);

      const addRecord = useCallback(() => {
        if (!form.amount || parseFloat(form.amount) <= 0) return;
        setRecords(prev => [{ id: Date.now(), type: form.type, amount: parseFloat(form.amount), category: form.category, note: form.note || form.category, date: new Date().toISOString().slice(0, 10) }, ...prev]);
        setForm({ type: 'expense', amount: '', category: '餐饮', note: '' });
        setShowForm(false);
      }, [form]);

      const deleteRecord = useCallback((id) => { setRecords(prev => prev.filter(r => r.id !== id)); }, []);

      const totalIncome = records.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
      const totalExpense = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
      const balance = totalIncome - totalExpense;

      const filteredRecords = records.filter(r => {
        if (filterType === 'income') return r.type === 'income';
        if (filterType === 'expense') return r.type === 'expense';
        return true;
      });

      return (
        <div className="app-container px-4 py-6">
          <h1 className="text-2xl font-bold text-white mb-2">💰 极简记账</h1>
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 mb-5 text-white shadow-lg">
            <p className="text-sm text-indigo-200 mb-1">本月余额</p>
            <p className="text-3xl font-bold">{balance.toFixed(2)}</p>
            <div className="flex justify-between mt-3 text-sm">
              <span className="text-green-300">收入 +{totalIncome.toFixed(2)}</span>
              <span className="text-rose-300">支出 -{totalExpense.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            {['all', 'expense', 'income'].map(t => (
              <button key={t} className={"px-4 py-1.5 rounded-full text-sm font-medium transition " + (filterType === t ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400')} onClick={() => setFilterType(t)}>
                {t === 'all' ? '全部' : t === 'expense' ? '支出' : '收入'}
              </button>
            ))}
          </div>
          <div className="space-y-2 mb-4">
            {filteredRecords.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-slate-800 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{backgroundColor: CATEGORY_COLORS[r.category] + '20'}}>
                    {r.type === 'income' ? '📥' : '📤'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{r.note}</p>
                    <p className="text-xs text-slate-500">{r.date} · {r.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={"font-semibold " + (r.type === 'income' ? 'text-green-400' : 'text-rose-400')}>{r.type === 'income' ? '+' : '-'}{r.amount.toFixed(2)}</span>
                  <button onClick={() => deleteRecord(r.id)} className="text-slate-600 hover:text-red-400 text-sm px-1">✕</button>
                </div>
              </div>
            ))}
            {filteredRecords.length === 0 && <p className="text-center text-slate-600 py-8">暂无记录</p>}
          </div>
          {showForm && (
            <div className="bg-slate-800 rounded-2xl p-4 mb-4 space-y-3">
              <div className="flex gap-2">
                <button className={"flex-1 py-2 rounded-xl text-sm font-medium " + (form.type === 'expense' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-400')} onClick={() => setForm(f => ({...f, type: 'expense'}))}>支出</button>
                <button className={"flex-1 py-2 rounded-xl text-sm font-medium " + (form.type === 'income' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400')} onClick={() => setForm(f => ({...f, type: 'income'}))}>收入</button>
              </div>
              <input type="number" placeholder="金额" value={form.amount} className="w-full bg-slate-900 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none border border-slate-700 focus:border-indigo-500" onChange={e => setForm(f => ({...f, amount: e.target.value}))} />
              <select value={form.category} className="w-full bg-slate-900 rounded-xl px-4 py-3 text-white outline-none border border-slate-700" onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="text" placeholder="备注（可选）" value={form.note} className="w-full bg-slate-900 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none border border-slate-700 focus:border-indigo-500" onChange={e => setForm(f => ({...f, note: e.target.value}))} />
              <button onClick={addRecord} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">记录</button>
            </div>
          )}
          <button onClick={() => setShowForm(v => !v)} className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full text-2xl shadow-xl hover:bg-indigo-700 transition flex items-center justify-center z-10" style={{maxWidth: 'calc(480px - 24px)', right: 'calc(50% - 240px + 12px)'}}>
            {showForm ? '✕' : '+'}
          </button>
        </div>
      );
    }
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>`;
}

function todoHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="manifest" href="${manifestDataUri('Todo 提醒', 'Todo', '#10b981', '✅')}">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .app-container { max-width: 480px; margin: 0 auto; min-height: 100vh; }
  </style>
  <title>Todo 提醒</title>
</head>
<body class="bg-slate-950">
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect } = React;
    const STORAGE_KEY = 'vibecraft_todo_data';

    function App() {
      const [todos, setTodos] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch { return []; }
      });
      const [input, setInput] = useState('');
      const [filter, setFilter] = useState('all');

      useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(todos)); }, [todos]);

      const addTodo = () => {
        if (!input.trim()) return;
        setTodos(prev => [{ id: Date.now(), text: input.trim(), done: false, createdAt: new Date().toISOString().slice(0, 10) }, ...prev]);
        setInput('');
      };

      const toggleTodo = (id) => { setTodos(prev => prev.map(t => t.id === id ? {...t, done: !t.done} : t)); };
      const deleteTodo = (id) => { setTodos(prev => prev.filter(t => t.id !== id)); };

      const filtered = todos.filter(t => {
        if (filter === 'active') return !t.done;
        if (filter === 'done') return t.done;
        return true;
      });
      const activeCount = todos.filter(t => !t.done).length;

      return (
        <div className="app-container px-4 py-6">
          <h1 className="text-2xl font-bold text-white mb-1">✅ Todo 提醒</h1>
          <p className="text-slate-500 text-sm mb-4">{activeCount} 项待完成</p>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="添加新任务..." value={input} className="flex-1 bg-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none border border-slate-700 focus:border-emerald-500" onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} />
            <button onClick={addTodo} className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition">添加</button>
          </div>
          <div className="flex gap-2 mb-4">
            {[{key:'all',label:'全部'},{key:'active',label:'进行中'},{key:'done',label:'已完成'}].map(f => (
              <button key={f.key} className={"px-4 py-1.5 rounded-full text-sm font-medium transition " + (filter === f.key ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400')} onClick={() => setFilter(f.key)}>{f.label}</button>
            ))}
          </div>
          <div className="space-y-2">
            {filtered.map(t => (
              <div key={t.id} className="flex items-center gap-3 bg-slate-800 rounded-xl p-3 group">
                <button onClick={() => toggleTodo(t.id)} className={"w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition flex-shrink-0 " + (t.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-600 text-transparent hover:border-emerald-500')}>✓</button>
                <span className={"flex-1 text-sm " + (t.done ? 'text-slate-600 line-through' : 'text-white')}>{t.text}</span>
                <span className="text-xs text-slate-600">{t.createdAt}</span>
                <button onClick={() => deleteTodo(t.id)} className="text-slate-600 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition">✕</button>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-center text-slate-600 py-8">暂无任务</p>}
          </div>
        </div>
      );
    }
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>`;
}

function checkinHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="manifest" href="${manifestDataUri('打卡手账', '打卡', '#8b5cf6', '📅')}">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .app-container { max-width: 480px; margin: 0 auto; min-height: 100vh; }
  </style>
  <title>打卡手账</title>
</head>
<body class="bg-slate-950">
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect } = React;
    const STORAGE_KEY = 'vibecraft_checkin_data';

    function App() {
      const [habits, setHabits] = useState(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch { return []; }
      });
      const [newHabit, setNewHabit] = useState('');
      const today = new Date().toISOString().slice(0, 10);

      useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(habits)); }, [habits]);

      const addHabit = () => {
        if (!newHabit.trim()) return;
        setHabits(prev => [...prev, { id: Date.now(), name: newHabit.trim(), emoji: '⭐', dates: {}, streak: 0 }]);
        setNewHabit('');
      };

      const toggleDate = (habitId) => {
        setHabits(prev => prev.map(h => {
          if (h.id !== habitId) return h;
          const dates = {...h.dates};
          if (dates[today]) delete dates[today];
          else dates[today] = true;
          let streak = 0;
          const d = new Date();
          while (true) {
            const key = d.toISOString().slice(0, 10);
            if ((dates[today] && key === today) || dates[key]) {
              if (key !== today || dates[today]) streak++;
              d.setDate(d.getDate() - 1);
            } else if (key !== today) break;
            else { d.setDate(d.getDate() - 1); continue; }
          }
          return {...h, dates, streak};
        }));
      };

      const getLast7Days = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i);
          days.push(d.toISOString().slice(0, 10));
        }
        return days;
      };
      const deleteHabit = (id) => { setHabits(prev => prev.filter(h => h.id !== id)); };

      return (
        <div className="app-container px-4 py-6">
          <h1 className="text-2xl font-bold text-white mb-1">📅 打卡手账</h1>
          <p className="text-slate-500 text-sm mb-4">{today}</p>
          <div className="flex gap-2 mb-5">
            <input type="text" placeholder="新习惯名称..." value={newHabit} className="flex-1 bg-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none border border-slate-700 focus:border-violet-500" onChange={e => setNewHabit(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()} />
            <button onClick={addHabit} className="px-5 py-3 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition">添加</button>
          </div>
          <div className="space-y-4">
            {habits.map(h => (
              <div key={h.id} className="bg-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{h.emoji}</span>
                    <span className="text-white font-medium">{h.name}</span>
                    {h.streak > 0 && <span className="text-xs bg-violet-600/20 text-violet-400 px-2 py-0.5 rounded-full">🔥 {h.streak}天</span>}
                  </div>
                  <button onClick={() => deleteHabit(h.id)} className="text-slate-600 hover:text-red-400 text-sm">✕</button>
                </div>
                <div className="flex gap-2 justify-between">
                  {getLast7Days().map(date => {
                    const checked = !!h.dates[date];
                    const isToday = date === today;
                    const dayName = ['日','一','二','三','四','五','六'][new Date(date).getDay()];
                    return (
                      <div key={date} className="flex flex-col items-center gap-1">
                        <span className="text-xs text-slate-600">{dayName}</span>
                        <button onClick={() => toggleDate(h.id)} className={"w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition " + (checked ? 'bg-violet-600 text-white' : isToday ? 'bg-slate-700 text-violet-400 border-2 border-violet-600' : 'bg-slate-700 text-slate-500')}>
                          {checked ? '✓' : date.slice(8)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {habits.length === 0 && <p className="text-center text-slate-600 py-8">创建你的第一个习惯打卡吧！</p>}
          </div>
        </div>
      );
    }
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>`;
}

export const TEMPLATES: Template[] = [
  {
    id: 'ledger',
    name: '极简记账本',
    description: '收支记录、分类统计，轻松管理财务',
    category: '记账',
    icon: '💰',
    cover_url: '/templates/ledger_preview.png',
    tags: ['记账', '财务', '统计'],
    compatibleSkills: ['chart', 'export_excel', 'budget_alert'],
    html: ledgerHtml(),
  },
  {
    id: 'todo',
    name: 'Todo 提醒',
    description: '任务管理、到期提醒，高效完成待办',
    category: '日程',
    icon: '✅',
    cover_url: '/templates/todo_preview.png',
    tags: ['待办', '任务', '提醒'],
    compatibleSkills: ['export_excel'],
    html: todoHtml(),
  },
  {
    id: 'checkin',
    name: '打卡手账',
    description: '每日习惯打卡、连续天数统计',
    category: '打卡',
    icon: '📅',
    cover_url: '/templates/checkin_preview.png',
    tags: ['打卡', '习惯', '日历'],
    compatibleSkills: ['chart', 'export_excel'],
    html: checkinHtml(),
  },
];
