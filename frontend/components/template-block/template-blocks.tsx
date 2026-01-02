import TemplateBlock from './template-block';
import styles from './template-blocks.module.scss';
import type { ReactNode } from 'react';

type TemplateBlockAdvantage = {
  text: string;
};

type TemplateBlockImage = {
  url: string;
  alt: string;
};

type TemplateBlockContent = {
  title: string;
  subtitle: string;
  description: string;
  advantages?: TemplateBlockAdvantage[];
  image?: TemplateBlockImage;
  imagePosition?: 'left' | 'right';
};

type Props = {
  blocks: TemplateBlockContent[];
  insertAfterBlockNumber?: number; // 1-based
  insertNode?: ReactNode;
  insertions?: Array<{ afterBlockNumber: number; node: ReactNode; key?: string | number }>;
};

export default function TemplateBlocks({ blocks, insertAfterBlockNumber, insertNode, insertions }: Props) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  const mergedInsertions: Array<{ afterBlockNumber: number; node: ReactNode; key?: string | number }> = Array.isArray(insertions)
    ? [...insertions]
    : [];

  if (insertNode && typeof insertAfterBlockNumber === 'number' && insertAfterBlockNumber > 0) {
    mergedInsertions.push({ afterBlockNumber: insertAfterBlockNumber, node: insertNode, key: 'legacy' });
  }

  const insertionMap = new Map<number, Array<{ node: ReactNode; key?: string | number }>>();
  for (const ins of mergedInsertions) {
    const afterIndex = typeof ins.afterBlockNumber === 'number' && ins.afterBlockNumber > 0 ? ins.afterBlockNumber - 1 : null;
    if (afterIndex === null) continue;
    const list = insertionMap.get(afterIndex) ?? [];
    list.push({ node: ins.node, key: ins.key });
    insertionMap.set(afterIndex, list);
  }

  return (
    <section className={styles.container}>
      <div className={styles.list}>
        {blocks.map((block, index) => (
          <div key={index}>
            <TemplateBlock
              title={block.title}
              subtitle={block.subtitle}
              description={block.description}
              advantages={block.advantages}
              image={block.image}
              imagePosition={block.imagePosition}
              index={index}
            />
            {(insertionMap.get(index) || []).map((ins, i) => (
              <div key={ins.key ?? i}>{ins.node}</div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
