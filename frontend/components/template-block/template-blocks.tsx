import TemplateBlock from './template-block';
import styles from './template-blocks.module.scss';

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
};

export default function TemplateBlocks({ blocks }: Props) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  return (
    <section className={styles.container}>
      <div className={styles.list}>
        {blocks.map((block, index) => (
          <TemplateBlock
            key={index}
            title={block.title}
            subtitle={block.subtitle}
            description={block.description}
            advantages={block.advantages}
            image={block.image}
            imagePosition={block.imagePosition}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
