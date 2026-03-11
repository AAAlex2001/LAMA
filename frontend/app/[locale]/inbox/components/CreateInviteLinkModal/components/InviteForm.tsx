'use client';

import React, { useState } from 'react';
import SearchBar from '@/components/search-bar/search-bar';
import { Checkbox } from '@/components/checkbox';
import { DatePicker } from '@/components/date-picker';
import { TimePicker } from '@/components/time-picker';
import Input from '@/components/input';
import Toggle from '@/components/toggle/toggle';
import { Button } from '@/components/new-button';
import buttonStyles from '@/components/new-button/styles.module.scss';
import CreateChannel from '@/components/create-channel/create-channel';
import styles from '../styles.module.scss';
import { ChannelBasic } from '@/types';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  useAppDispatch,
  useAppSelector,
  setChannelSearch,
  setSelectedChannelId,
  setLinkName,
  setHasLimit,
  setLimitCount,
  setLinkType,
  setValidityPeriod,
  setExpirationDate,
  setExpirationHours,
  setExpirationMinutes,
  setConnectionMethod,
  setLoginMethod,
  setJoiningText,
  setApplicationMethod,
  setHasCaptcha,
  buildPreviewData,
  setStep,
  addChannelThunk,
  fetchChannelsThunk,
} from '../../../store';

interface InviteFormProps {
  channels: ChannelBasic[];
  maxChannels: number;
  onEditingConfirm?: () => void;
}

const InviteForm: React.FC<InviteFormProps> = ({
  channels,
  maxChannels,
  onEditingConfirm,
}) => {
  const dispatch = useAppDispatch();
  const modalState = useAppSelector((state) => state.createInviteLinkModal);
  const channelsState = useAppSelector((state) => state.channels);
  const { showSuccess, showError } = useNotifications();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  
  const {
    channelSearch,
    selectedChannelId,
    linkName,
    hasLimit,
    limitCount,
    linkType,
    validityPeriod,
    expirationDate: expirationDateString,
    expirationHours,
    expirationMinutes,
    connectionMethod,
    loginMethod,
    applicationMethod,
    hasCaptcha,
    editingLinkId,
  } = modalState;
  
  const expirationDate = expirationDateString ? new Date(expirationDateString) : null;
  const filteredChannels = channels.filter((channel) =>
    channel.title.toLowerCase().includes(channelSearch.toLowerCase())
  );

  const handleSubmit = () => {
      if (editingLinkId && onEditingConfirm) {
        onEditingConfirm();
      } else {
        dispatch(buildPreviewData());
        dispatch(setStep('confirm'));
      }
  };

  const handleAddChannel = async (link: string) => {
    try {
      await dispatch(addChannelThunk(link)).unwrap();
      await dispatch(fetchChannelsThunk({ force: true }));
      showSuccess('Канал успешно подключен');
      setShowCreateChannel(false);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось подключить канал';
      showError(errorMessage);
      return false;
    }
  };

  const isSubmitDisabled = !linkName?.trim() || !selectedChannelId;

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Выберите канал</div>
        <div className={styles.searchContainer}>
          <SearchBar
            placeholder="Поиск по каналам"
            value={channelSearch}
            onChange={(value) => dispatch(setChannelSearch(value))}
          />
        </div>
        <div className={styles.channelsList}>
          {filteredChannels.map((channel) => (
            <div key={channel.id} className={styles.channelItem}>
              <Checkbox
                variant="radio"
                checked={selectedChannelId === channel.id.toString()}
                onChange={() => dispatch(setSelectedChannelId(channel.id.toString()))}
              />
              <span className={styles.channelItemName}>{channel.title}</span>
            </div>
          ))}
          <Button 
            type="button"
            variant="outline"
            intent="gradient"
            size="lg"
            style={{ width: '100%', gap: "10px" }}
            onClick={() => setShowCreateChannel(true)}
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
          onChange={(value) => dispatch(setLinkName(value))}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Лимит по количеству вступлений</span>
          <Toggle checked={hasLimit} onChange={(value) => dispatch(setHasLimit(value))} />
        </div>
        {hasLimit && (
          <Input
            type="text"
            placeholder="Например, 100"
            value={limitCount?.toString() || ''}
            onChange={(value) => dispatch(setLimitCount(value))}
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
              onChange={() => dispatch(setLinkType('open'))}
            />
            <span className={styles.channelItemName}>Открытая</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={linkType === 'closed'}
              onChange={() => dispatch(setLinkType('closed'))}
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
              onChange={() => dispatch(setValidityPeriod('indefinite'))}
            />
            <span className={styles.channelItemName}>Бессрочно</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={validityPeriod === 'date'}
              onChange={() => {
                dispatch(setValidityPeriod('date'));
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                dispatch(setExpirationDate(today.toISOString()));
              }}
            />
            <span className={styles.channelItemName}>До даты</span>
          </div>
        </div>
        {validityPeriod === 'date' && (
          <div className={styles.dateTimeContainer}>
            <div className={styles.datePickerContainer}>
              <DatePicker
                value={expirationDate || undefined}
                onChange={(date) => dispatch(setExpirationDate(date ? date.toISOString() : null))}
                locale="ru"
                minDate={null}
                className={styles.datePickerComponent}
              />
            </div>
            <div className={styles.timePickerContainer}>
              <TimePicker
                hours={expirationHours}
                minutes={expirationMinutes}
                onHoursChange={(hours) => dispatch(setExpirationHours(hours))}
                onMinutesChange={(minutes) => dispatch(setExpirationMinutes(minutes))}
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
              onChange={() => dispatch(setConnectionMethod('protection'))}
            />
            <span className={styles.channelItemName}>Защита</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={connectionMethod === 'normal'}
              onChange={() => dispatch(setConnectionMethod('normal'))}
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
              onChange={() => dispatch(setLoginMethod('direct'))}
            />
            <span className={styles.channelItemName}>Прямая ссылка</span>
          </div>
          <div className={styles.radioGroupItem}>
            <Checkbox
              variant="radio"
              checked={loginMethod === 'bot'}
              onChange={() => dispatch(setLoginMethod('bot'))}
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
                  onChange={() => dispatch(setApplicationMethod('direct'))}
                />
                <span className={styles.channelItemName}>Прямая заявка</span>
              </div>
              <div className={styles.radioGroupItem}>
                <Checkbox
                  variant="radio"
                  checked={applicationMethod === 'bot'}
                  onChange={() => dispatch(setApplicationMethod('bot'))}
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
                onChange={(value) => dispatch(setHasCaptcha(value))}
              />
              <span className={styles.channelItemName}>Капча перед подачей заявки</span>
            </div>
          </div>
        </>
      )}

      <div className={styles.submitButtonContainer}>
        <Button
          variant="fill"
          intent="gradient"
          size="lg"
          onClick={handleSubmit}
          className={styles.submitButton}
          disabled={isSubmitDisabled}
          style={{ width: '100%' }}
        >
          {editingLinkId ? 'Сохранить изменения' : 'Продолжить'}
        </Button>
      </div>

      {showCreateChannel && (
        <div className={styles.createChannelModalOverlay} onClick={() => setShowCreateChannel(false)}>
          <div className={styles.createChannelModalContent} onClick={e => e.stopPropagation()}>
            <CreateChannel
              onSubmit={handleAddChannel}
              onCancel={() => setShowCreateChannel(false)}
              loading={channelsState.syncing}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default InviteForm;
