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
};

export default function TemplateBlocks({ blocks, insertAfterBlockNumber, insertNode }: Props) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  const afterIndex = typeof insertAfterBlockNumber === 'number' && insertAfterBlockNumber > 0 ? insertAfterBlockNumber - 1 : null;

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
            {afterIndex === index ? insertNode : null}
          </div>
        ))}
      </div>
    </section>
  );
}
