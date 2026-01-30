'use client';

import type { RefObject } from 'react';
import Input from '@/components/input';
import { CheckIcon, CloseIcon } from '@/components/icons';
import styles from '../rich-text-editor.module.scss';

interface LinkInputProps {
  linkInputRef: RefObject<HTMLInputElement | null>;
  linkUrl: string;
  onLinkUrlChange: (value: string) => void;
  onLinkSubmit: () => void;
  onCloseLinkInput: () => void;
}

export default function LinkInput({
  linkInputRef,
  linkUrl,
  onLinkUrlChange,
  onLinkSubmit,
  onCloseLinkInput,
}: LinkInputProps) {
  return (
    <div className={styles.linkInputWrapper}>
      <Input
        inputRef={linkInputRef}
        value={linkUrl}
        onChange={onLinkUrlChange}
        placeholder="Вставьте ссылку..."
        className={styles.linkInputField}
        variant="white"
        icons={[
          {
            icon: <CheckIcon width={16} height={16} color="#8C8C8C" />,
            onClick: onLinkSubmit,
            disabled: !linkUrl.trim(),
            className: styles.linkApplyIcon,
          },
          {
            icon: <CloseIcon width={16} height={16} color="#8C8C8C" />,
            onClick: onCloseLinkInput,
            className: styles.linkCancelIcon,
          },
        ]}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onLinkSubmit();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            onCloseLinkInput();
          }
        }}
      />
    </div>
  );
}
