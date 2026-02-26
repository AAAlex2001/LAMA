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
        type: 'image',
        src: 'https://storage.yandexcloud.net/lamaplanner/thumbnails/6ba4e973-71a8-4ac6-980f-f4584e2d157b-thumb.jpg',
      },
      {
        type: 'image',
        src: 'https://storage.yandexcloud.net/lamaplanner/thumbnails/6ba4e973-71a8-4ac6-980f-f4584e2d157b-thumb.jpg',
      },
      {
        type: 'image',
        src: 'https://storage.yandexcloud.net/lamaplanner/thumbnails/6ba4e973-71a8-4ac6-980f-f4584e2d157b-thumb.jpg',
      },
    ],
    date: new Date(),
  },
  {
    type: 'incoming',
    text: 'Check out this video I recorded!',
    mediaItems: [
      {
        type: 'video',
        src: 'https://storage.yandexcloud.net/lamaplanner/videos/sample-video-1.mp4',
        id: 'video-1',
      },
    ],
    time: '16:45',
    date: new Date(),
  },
  {
    type: 'outgoing',
    mediaItems: [
      {
        type: 'video',
        src: 'https://storage.yandexcloud.net/lamaplanner/videos/sample-video-2.mp4',
        id: 'video-2',
      },
    ],
    time: '16:46',
    date: new Date(),
  },
  {
    type: 'incoming',
    text: 'Here are some documents for you to review',
    mediaItems: [
      {
        type: 'file',
        src: 'https://storage.yandexcloud.net/lamaplanner/documents/report-2024.pdf',
        id: 'file-1',
      },
      {
        type: 'file',
        src: 'https://storage.yandexcloud.net/lamaplanner/documents/presentation.pptx',
        id: 'file-2',
      },
    ],
    time: '16:50',
    date: new Date(),
  },
  {
    type: 'outgoing',
    mediaItems: [
      {
        type: 'file',
        src: 'https://storage.yandexcloud.net/lamaplanner/documents/spreadsheet.xlsx',
        id: 'file-3',
      },
    ],
    time: '16:52',
    date: new Date(),
  },
  {
    type: 'incoming',
    text: 'Mixed media message with images and videos',
    mediaItems: [
      {
        type: 'image',
        src: 'https://storage.yandexcloud.net/lamaplanner/thumbnails/6ba4e973-71a8-4ac6-980f-f4584e2d157b-thumb.jpg',
        id: 'img-1',
      },
      {
        type: 'video',
        src: 'https://storage.yandexcloud.net/lamaplanner/videos/sample-video-3.mp4',
        id: 'video-3',
      },
      {
        type: 'image',
        src: 'https://storage.yandexcloud.net/lamaplanner/thumbnails/6ba4e973-71a8-4ac6-980f-f4584e2d157b-thumb.jpg',
        id: 'img-2',
      },
    ],
    time: '17:00',
    date: new Date(),
  },
  {
    type: 'outgoing',
    text: 'Here is a document with some text',
    mediaItems: [
      {
        type: 'file',
        src: 'https://storage.yandexcloud.net/lamaplanner/documents/document.docx',
        id: 'file-4',
      },
    ],
    time: '17:05',
    date: new Date(),
  },
  {
    type: 'incoming',
    mediaItems: [
      {
        type: 'video',
        src: 'https://storage.yandexcloud.net/lamaplanner/videos/sample-video-4.mp4',
        id: 'video-4',
      },
      {
        type: 'video',
        src: 'https://storage.yandexcloud.net/lamaplanner/videos/sample-video-5.mp4',
        id: 'video-5',
      },
    ],
    time: '17:10',
    date: new Date(),
  },
  {
    type: 'outgoing',
    mediaItems: [
      {
        type: 'file',
        src: 'https://storage.yandexcloud.net/lamaplanner/documents/data.csv',
        id: 'file-5',
      },
      {
        type: 'file',
        src: 'https://storage.yandexcloud.net/lamaplanner/documents/notes.txt',
        id: 'file-6',
      },
      {
        type: 'file',
        src: 'https://storage.yandexcloud.net/lamaplanner/documents/archive.zip',
        id: 'file-7',
      },
    ],
    time: '17:15',
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