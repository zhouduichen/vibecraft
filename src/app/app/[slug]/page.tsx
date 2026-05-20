import { db } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function PublishedApp({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await db
    .from('published_apps')
    .select('html_content')
    .eq('slug', slug)
    .single();

  if (!data) notFound();

  return <div dangerouslySetInnerHTML={{ __html: data.html_content }} />;
}
