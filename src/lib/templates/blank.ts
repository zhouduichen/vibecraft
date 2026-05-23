export function buildBlankTemplateHtml(appName: string): string {
  const safeName = appName.replace(/[<>&"]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
  }[char] || char));

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="min-h-screen bg-stone-50 text-stone-950">
  <div id="root"></div>
  <script type="text/babel">
    const { useState } = React;

    function App() {
      const [note, setNote] = useState(() => {
        try { return localStorage.getItem('vibecraft_blank_note') || ''; }
        catch { return ''; }
      });

      const updateNote = (value) => {
        setNote(value);
        try { localStorage.setItem('vibecraft_blank_note', value); }
        catch {}
      };

      return (
        <main className="min-h-screen flex items-center justify-center p-6">
          <section className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-stone-500 mb-2">VibeCraft starter</p>
            <h1 className="text-2xl font-semibold tracking-tight mb-3">${safeName}</h1>
            <p className="text-stone-600 mb-5">告诉 VibeCraft 你想把它改成什么，它会从这个轻量起点继续生成。</p>
            <textarea
              value={note}
              onChange={(event) => updateNote(event.target.value)}
              placeholder="先记下一点想法..."
              className="w-full min-h-28 rounded-xl border border-stone-200 p-3 outline-none focus:border-stone-500"
            />
          </section>
        </main>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>`;
}
