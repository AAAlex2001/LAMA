'use client';

import React from 'react';
import SearchBar from '@/components/search-bar/search-bar';
import { Checkbox } from '@/components/checkbox';
import { DatePicker } from '@/components/date-picker';
import { TimePicker } from '@/components/time-picker';
import Input from '@/components/input';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/new-button';
import buttonStyles from '@/components/new-button/styles.module.scss';
import styles from './styles.module.scss';
import { Channel } from './index';

interface InviteFormProps {
  channels: Channel[];
  maxChannels: number;
  channelSearch: string;
  onChannelSearchChange: (value: string) => void;
  selectedChannelId: string;
  onChannelSelect: (channelId: string) => void;
  linkName: string;
  onLinkNameChange: (value: string) => void;
  hasLimit: boolean;
  onHasLimitChange: (value: boolean) => void;
  limitCount: string;
  onLimitCountChange: (value: string) => void;
  linkType: 'open' | 'closed';
  onLinkTypeChange: (type: 'open' | 'closed') => void;
  validityPeriod: 'indefinite' | 'date';
  onValidityPeriodChange: (period: 'indefinite' | 'date') => void;
  expirationDate: Date | null;
  onExpirationDateChange: (date: Date | null) => void;
  expirationHours: number;
  onExpirationHoursChange: (hours: number) => void;
  expirationMinutes: number;
  onExpirationMinutesChange: (minutes: number) => void;
  connectionMethod: 'protection' | 'normal';
  onConnectionMethodChange: (method: 'protection' | 'normal') => void;
  loginMethod: 'direct' | 'bot';
  onLoginMethodChange: (method: 'direct' | 'bot') => void;
  joiningText: string;
  onJoiningTextChange: (value: string) => void;
  applicationMethod: 'direct' | 'bot';
  onApplicationMethodChange: (method: 'direct' | 'bot') => void;
  hasCaptcha: boolean;
  onHasCaptchaChange: (value: boolean) => void;
}

const InviteForm: React.FC<InviteFormProps> = ({
  channels,
  maxChannels,
  channelSearch,
  onChannelSearchChange,
  selectedChannelId,
  onChannelSelect,
  linkName,
  onLinkNameChange,
  hasLimit,
  onHasLimitChange,
  limitCount,
  onLimitCountChange,
  linkType,
  onLinkTypeChange,
  validityPeriod,
  onValidityPeriodChange,
  expirationDate,
  onExpirationDateChange,
  expirationHours,
  onExpirationHoursChange,
  expirationMinutes,
  onExpirationMinutesChange,
  connectionMethod,
  onConnectionMethodChange,
  loginMethod,
  onLoginMethodChange,
  joiningText,
  onJoiningTextChange,
  applicationMethod,
  onApplicationMethodChange,
  hasCaptcha,
  onHasCaptchaChange,
}) => {
  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(channelSearch.toLowerCase())
  );

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Выберите канал</div>
        <div className={styles.searchContainer}>
          <SearchBar
            placeholder="Поиск по каналам"
            value={channelSearch}
            onChange={onChannelSearchChange}
          />
        </div>
        <div className={styles.channelsList}>
          {filteredChannels.map((channel) => (
            <div key={channel.id} className={styles.channelItem}>
              <Checkbox
                variant="radio"
                checked={selectedChannelId === channel.id}
                onChange={() => onChannelSelect(channel.id)}
              />
              <span className={styles.channelItemName}>{channel.name}</span>
            </div>
          ))}
          <Button 
            type="button"
            variant="outline"
            intent="gradient"
            size="lg"
            style={{ width: '100%', gap: "10px" }}
          >
            <span className={buttonStyles.label}>Подключить новый</span>
            <span className={styles.channelsCount}>{`${channels.length}/${maxChannels}`}</span>
          </Button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.channelItemName}>Название ссылки</div>
        <Input
          placeholder="Например"
          value={linkName}
          onChange={onLinkNameChange}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Лимит по количеству вступлений</span>
          <Toggle checked={hasLimit} onChange={onHasLimitChange} />
        </div>
        {hasLimit && (
          <Input
            type="text"
            placeholder="Например, 100"
            value={limitCount?.toString() || ''}
            onChange={onLimitCountChange}
          />
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Тип ссылки:</div>
        <div className={styles.radioGroup}>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={linkType === 'open'}
              onChange={() => onLinkTypeChange('open')}
            />
            <span className={styles.channelItemName}>Открытая</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={linkType === 'closed'}
              onChange={() => onLinkTypeChange('closed')}
            />
            <span className={styles.channelItemName}>Закрытая <span className={styles.withConfirm}>(с подтверждением)</span></span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Срок действия ссылки:</div>
        <div className={styles.radioGroup}>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={validityPeriod === 'indefinite'}
              onChange={() => onValidityPeriodChange('indefinite')}
            />
            <span className={styles.channelItemName}>Бессрочно</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={validityPeriod === 'date'}
              onChange={() => onValidityPeriodChange('date')}
            />
            <span className={styles.channelItemName}>До даты</span>
          </div>
        </div>
        {validityPeriod === 'date' && (
          <div className={styles.dateTimeContainer}>
            <div className={styles.datePickerContainer}>
              <DatePicker
                value={expirationDate || undefined}
                onChange={(date) => onExpirationDateChange(date)}
                locale="ru"
                minDate={null}
              />
            </div>
            <div className={styles.timePickerContainer}>
              <TimePicker
                hours={expirationHours}
                minutes={expirationMinutes}
                onHoursChange={onExpirationHoursChange}
                onMinutesChange={onExpirationMinutesChange}
                selectedDate={expirationDate || null}
                notShowQuickTimes
                notShowHint
              />
            </div>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Способ подключения</div>
        <div className={styles.radioGroup}>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={connectionMethod === 'protection'}
              onChange={() => onConnectionMethodChange('protection')}
            />
            <span className={styles.channelItemName}>Защита</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={connectionMethod === 'normal'}
              onChange={() => onConnectionMethodChange('normal')}
            />
            <span className={styles.channelItemName}>Обычная</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Способ входа</div>
        <div className={styles.radioGroup}>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={loginMethod === 'direct'}
              onChange={() => onLoginMethodChange('direct')}
            />
            <span className={styles.channelItemName}>Прямая ссылка</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={loginMethod === 'bot'}
              onChange={() => onLoginMethodChange('bot')}
            />
            <span className={styles.channelItemName}>Через приветственного бота</span>
          </div>
        </div>
      </div>

      {linkType === 'closed' && (
        <>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Процесс вступления</div>
            <div className={styles.sectionDescription}>
              Заявки будут отображаться во вкладке «Модерация»
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Как пользователь подает заявку:</div>
            <div className={styles.radioGroup}>
              <div className={styles.radioGroupItem}>
                <Checkbox
                  variant="radio"
                  checked={applicationMethod === 'direct'}
                  onChange={() => onApplicationMethodChange('direct')}
                />
                <span className={styles.channelItemName}>Прямая заявка</span>
              </div>
              <div className={styles.radioGroupItem}>
                <Checkbox
                  variant="radio"
                  checked={applicationMethod === 'bot'}
                  onChange={() => onApplicationMethodChange('bot')}
                />
                <span className={styles.channelItemName}>Через приветственного бота</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Дополнительная защита (опционально):</div>
            <div className={styles.radioGroupItem}>
              <Checkbox
                checked={hasCaptcha}
                onChange={onHasCaptchaChange}
              />
              <span className={styles.channelItemName}>Капча перед подачей заявки</span>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default InviteForm;
