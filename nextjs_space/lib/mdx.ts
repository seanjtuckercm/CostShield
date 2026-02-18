/**
 * MDX Utilities
 * Helper functions for MDX content processing
 */

import { serialize } from 'next-mdx-remote/serialize';
import { MDXRemoteSerializeResult } from 'next-mdx-remote';
import fs from 'fs';
import path from 'path';

export async function getMDXContent(filePath: string): Promise<MDXRemoteSerializeResult> {
  const fullPath = path.join(process.cwd(), 'content', filePath);
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  
  return await serialize(fileContents, {
    parseFrontmatter: true,
  });
}

export function getAllMDXFiles(directory: string): string[] {
  const fullPath = path.join(process.cwd(), 'content', directory);
  
  if (!fs.existsSync(fullPath)) {
    return [];
  }
  
  const files = fs.readdirSync(fullPath, { recursive: true });
  return files
    .filter((file): file is string => typeof file === 'string' && file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx$/, ''));
}
