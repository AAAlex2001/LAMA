'use client';

import { FC, useState } from 'react';
import Modal from '@/components/modal';
import Input from '@/components/input';
import LimitsModal from '@/components/limits-modal/limits-modal';
import styles from '../profile.module.scss';

const LIMIT_SECTIONS = [
  {
    title: 'Каналы/чаты',
    items: [
      { id: '1', name: 'Канал 1' },
      { id: '2', name: 'Канал 2' },
      { id: '3', name: 'Канал 3' },
    ],
    current: 3,
    total: 5,
  },
  {
    title: 'Боты',
    items: [
      { id: '1', name: 'Бот 1' },
      { id: '2', name: 'Бот 2' },
      { id: '3', name: 'Бот 3' },
    ],
    current: 3,
    total: 5,
  },
  {
    title: 'RSS-ленты/репостеры',
    items: [
      { id: '1', name: 'RSS 1' },
      { id: '2', name: 'RSS 2' },
      { id: '3', name: 'RSS 3' },
    ],
    current: 3,
    total: 3,
  },
];

interface ProfileModalsProps {
  isLimitsOpen: boolean;
  onLimitsClose: () => void;
  isLogoutOpen: boolean;
  onLogoutClose: () => void;
  isDeleteOpen: boolean;
  onDeleteClose: () => void;
  isEmailOpen: boolean;
  onEmailClose: () => void;
  isPasswordOpen: boolean;
  onPasswordClose: () => void;
}

const ProfileModals: FC<ProfileModalsProps> = ({
  isLimitsOpen, onLimitsClose,
  isLogoutOpen, onLogoutClose,
  isDeleteOpen, onDeleteClose,
  isEmailOpen, onEmailClose,
  isPasswordOpen, onPasswordClose,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <>
      <LimitsModal isOpen={isLimitsOpen} onClose={onLimitsClose} sections={LIMIT_SECTIONS} />

      <Modal
        isOpen={isLogoutOpen}
        onClose={onLogoutClose}
        onConfirm={onLogoutClose}
        title="Выйти из аккаунта?"
        description="Вы сможете войти снова в любой момент"
        confirmText="Выйти"
        cancelText="Отменить"
        confirmVariant="default"
        confirmActive
        cancelActive={false}
      />

      <Modal
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={onDeleteClose}
        title="Удалить аккаунт?"
        description="Вы собираетесь навсегда удалить аккаунт LamaPlanner. Это действие необратимо"
        confirmText="Удалить все данные"
        cancelText="Отменить"
        confirmVariant="outlined-red"
        confirmActive={false}
        cancelActive
        confirmFirst
      />

      <Modal
        isOpen={isEmailOpen}
        onClose={onEmailClose}
        onConfirm={() => setNewEmail('')}
        title="Смена электронной почты"
        description="Мы отправим письмо для подтверждения нового адреса"
        confirmText="Подтвердить"
        cancelText="Отменить"
        confirmVariant="default"
        confirmActive
        cancelActive={false}
        buttonsDirection="row"
      >
        <Input
          label="Новая электронная почта"
          value={newEmail}
          onChange={setNewEmail}
          placeholder="Введите новый email"
        />
      </Modal>

      <Modal
        isOpen={isPasswordOpen}
        onClose={onPasswordClose}
        onConfirm={() => {
          setNewPassword('');
          setConfirmPassword('');
        }}
        title="Смена пароля"
        description="Мы отправим письмо для подтверждения смены пароля"
        confirmText="Подтвердить"
        cancelText="Отменить"
        confirmVariant="default"
        confirmActive
        cancelActive={false}
        buttonsDirection="row"
      >
        <div className={styles.modalFields}>
          <Input
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Введите новый пароль"
          />
          <Input
            label="Подтверждение пароля"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Повторите новый пароль"
          />
        </div>
      </Modal>
    </>
  );
};

export default ProfileModals;
