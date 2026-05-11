import React from 'react';
import TemplateSubscribe from '@/components/template-subscribe/template-subscribe';
import type { TemplatePageContent, SubscribeBlockItem } from './types';

type Position = 'after_block' | 'after_faq' | 'after_cards';

function paddingForPosition(position: Position): string {
  if (position === 'after_block') return '100px 20px 0 20px';
  if (position === 'after_faq') return '0 20px 100px 20px';
  return '0 20px 180px 20px';
}

function getSubscribeItems(content: TemplatePageContent): SubscribeBlockItem[] {
  const items = Array.isArray(content.subscribeBlocks) ? content.subscribeBlocks : [];
  if (items.length) return items;

  if (content.subscribeBlock) {
    return [{
      ...content.subscribeBlock,
      placement: content.subscribePlacement ?? undefined,
    }];
  }
  return [];
}

export interface SubscribeBlocksResult {
  afterFaq: React.ReactNode[];
  afterCards: React.ReactNode[];
  insertions: Array<{ afterBlockNumber: number; node: React.ReactNode; key?: string }>;
}

export function buildSubscribeBlocks(content: TemplatePageContent): SubscribeBlocksResult {
  const blocksCount = Array.isArray(content.blocks) ? content.blocks.length : 0;
  const items = getSubscribeItems(content);

  const afterFaq: React.ReactNode[] = [];
  const afterCards: React.ReactNode[] = [];
  const insertions: Array<{ afterBlockNumber: number; node: React.ReactNode; key?: string }> = [];

  items.forEach((item, idx) => {
    const title = String(item?.title || '').trim();
    const subtitle = String(item?.subtitle || '').trim();
    const buttonText = String(item?.buttonText || '').trim();
    const buttonLink = String(item?.buttonLink || '').trim();
    const hasAny = Boolean(title || subtitle || buttonText || buttonLink);
    if (!hasAny) return;

    const placement = item?.placement ?? null;
    const position = placement?.position || 'after_cards';
    const requestedAfterBlock = position === 'after_block' ? Number(placement?.afterBlockNumber || 0) : 0;
    const canRenderInBlocks = requestedAfterBlock >= 1 && blocksCount >= requestedAfterBlock;

    const node = (
      <div style={{ padding: paddingForPosition(position) }}>
        <TemplateSubscribe
          title={item.title}
          subtitle={item.subtitle}
          buttonText={item.buttonText}
          buttonLink={item.buttonLink}
        />
      </div>
    );

    if (position === 'after_faq') {
      afterFaq.push(<div key={`sub_after_faq_${idx}`}>{node}</div>);
      return;
    }

    if (position === 'after_block' && canRenderInBlocks) {
      insertions.push({
        afterBlockNumber: requestedAfterBlock,
        node,
        key: `sub_after_block_${idx}`,
      });
      return;
    }

    afterCards.push(<div key={`sub_after_cards_${idx}`}>{node}</div>);
  });

  return { afterFaq, afterCards, insertions };
}
