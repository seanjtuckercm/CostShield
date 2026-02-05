/**
 * Documentation Page (MDX)
 * Dynamic route for rendering MDX documentation files
 * Reference: Section 6.4 of COSTSHIELD_MARKETING_WEBSITE_SPEC.md
 */

import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { getAllMDXFiles } from '@/lib/mdx';

const components = {
  h1: (props: any) => <h1 className="text-4xl font-bold mt-8 mb-4" {...props} />,
  h2: (props: any) => <h2 className="text-3xl font-bold mt-6 mb-3" {...props} />,
  h3: (props: any) => <h3 className="text-2xl font-semibold mt-4 mb-2" {...props} />,
  p: (props: any) => <p className="mb-4 text-gray-700" {...props} />,
  ul: (props: any) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
  ol: (props: any) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
  li: (props: any) => <li className="ml-4" {...props} />,
  code: (props: any) => (
    <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props} />
  ),
  pre: (props: any) => (
    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4" {...props} />
  ),
  a: (props: any) => (
    <a className="text-blue-600 hover:underline" {...props} />
  ),
};

export async function generateStaticParams() {
  const files = getAllMDXFiles('docs');
  return files.map((file) => ({
    slug: file.split('/'),
  }));
}

export default async function DocsPage({ params }: { params: { slug?: string[] } }) {
  const slug = params.slug || ['quickstart'];
  const filePath = path.join('docs', ...slug) + '.mdx';
  const fullPath = path.join(process.cwd(), 'content', filePath);

  if (!fs.existsSync(fullPath)) {
    notFound();
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <article className="prose prose-lg max-w-none">
          <MDXRemote source={fileContents} components={components} />
        </article>
      </div>
    </div>
  );
}
