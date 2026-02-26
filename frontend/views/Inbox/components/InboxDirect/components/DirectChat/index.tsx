'use client';

import { useState, useRef } from 'react';
import styles from './styles.module.scss';
import MessageElement, { MessageProps } from './components/MessageElement';
import MessageField from './components/MessageField';
import { BlockedIcon, ChatChevronIcon, PinIcon } from '@/components/icons';
import classNames from 'classnames';
import { useDateSeparator } from './useDateSeparator';

const mockMessages: (MessageProps & { date: Date })[] = [
  {
    type: 'incoming',
    text: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters.',
    time: '16:23',
    date: new Date(),
  },
  {
    type: 'incoming',
    text: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters.',
    time: '16:23',
    date: new Date(),
  },
  {
    type: 'incoming',
    text: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters.',
    time: '16:23',
    date: new Date(),
  },
  {
    type: 'incoming',
    text: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters.',
    time: '16:23',
    date: new Date(),
  },
  {
    type: 'system',
    text: 'It is a .',
    date: new Date(),
  },
  {
    type: 'outgoing',
    text: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters.',
    time: '16:23',
    date: new Date(),
  },
  {
    type: 'outgoing',
    mediaItems: [
      {
        type: 'video',
        src: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
      },
      {
        type: 'file',
        src: 'https://via.placeholder.com/800/50C878/FFFFFF?text=Image+1',
      },
      {
        type: 'video',
        src: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_2mb.mp4',
      },
      {
        type: 'file',
        src: 'https://via.placeholder.com/800/F39C12/FFFFFF?text=Image+2',
      },
    ],
    date: new Date(),
  },
];



const DirectChat = () => {
  const [isPinned, setIsPinned] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [message, setMessage] = useState('');
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { visibleDate, showDateSeparator } = useDateSeparator({
    messages: mockMessages,
    messageListRef,
    messageRefs,
  });

  const handleSendMessage = async () => {
    console.log('send message');
  };

  const handlePinChat = async () => {
    console.log('pin chat');
  };

  const handleBlockChat = async () => {
    console.log('block chat');
  };

  return (
    <div className={styles.directChat}>
      <div className={styles.header}>
        <button className={styles.backButton} type="button">
          <ChatChevronIcon width={32} height={32} />
        </button>
        <div className={styles.userInfo}>
          <span className={styles.userName}>Имя пользователя</span>
          <span className={styles.botName}>Через бота @LamaBot</span>
        </div>
        <div className={styles.headerActionsWrapper}>
          <div className={styles.headerActions}>
            <button 
              className={classNames(styles.iconButtonPin, { [styles.blue]: isPinned })} 
              type="button"
              onClick={handlePinChat}
            >
              <PinIcon width={16} height={16} />
            </button>
            <button 
              className={classNames(styles.iconButtonBlock, { [styles.destructive]: isBlocked })} 
              type="button" 
              onClick={handleBlockChat}
            >
              <BlockedIcon width={16} height={16} />
            </button>
          </div>
        </div>
      </div>
      {showDateSeparator && visibleDate && (
        <div className={styles.dateSeparator}>
          <span>{visibleDate}</span>
        </div>
      )}
      <div className={styles.messageList} ref={messageListRef}>
        {mockMessages.map((msg, i) => (
          <div
            key={i}
            ref={(el) => {
              messageRefs.current[i] = el;
            }}
          >
            <MessageElement {...msg} />
          </div>
        ))}
      </div>
      <MessageField value={message} onChange={setMessage} onSendMessage={handleSendMessage} />
    </div>
  );
};

export default DirectChat;
