import { db } from '@/lib/db';

export default async function PublishedApp({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Check if app was revoked
  const { data: revoked } = await db
    .from('published_apps')
    .select('revoked_at')
    .eq('slug', slug)
    .not('revoked_at', 'is', null)
    .maybeSingle();

  if (revoked) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', padding: 24, background: '#fafafa' }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>◻</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px' }}>该分享已被撤回</h1>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>发布者已移除了这个作品的公开访问链接</p>
      </div>
    );
  }

  const { data } = await db
    .from('published_apps')
    .select('html_content')
    .eq('slug', slug)
    .is('revoked_at', null)
    .single();

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui, sans-serif', padding: 24, background: '#fafafa' }}>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>?</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px' }}>页面不存在</h1>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>该分享链接无效或已被删除</p>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={data.html_content}
      title="VibeCraft App"
      sandbox="allow-scripts allow-forms allow-popups"
      style={{ width: '100vw', height: '100vh', border: 'none', display: 'block' }}
    />
  );
}
