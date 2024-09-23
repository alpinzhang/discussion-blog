import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from '@shikijs/rehype'

export const parseMarkdown = (markdown: string) => {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeShiki, {
      themes: {
        light: 'vitesse-dark',
        dark: 'vitesse-dark',
      }
    })
    .use(rehypeSlug)
    .use(rehypeStringify)
    .process(markdown);
};
