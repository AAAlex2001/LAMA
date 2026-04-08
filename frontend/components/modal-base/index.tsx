'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import classNames from 'classnames';
import styles from './styles.module.scss';
import CloseIcon from '../icons/close-icon';

interface ModalContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('Modal components must be used within ModalBase');
  }
  return context;
}

interface ModalBaseProps {
  children: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  defaultOpen?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

const ModalBase = ({
  children,
  isOpen: controlledIsOpen,
  onOpenChange,
  defaultOpen = false,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
}: ModalBaseProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const modalRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const setOpen = (open: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(open);
    }
    onOpenChange?.(open);
  };

  const open = () => setOpen(true);
  const close = () => setOpen(false);
  const toggle = () => setOpen(!isOpen);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const contextValue: ModalContextValue = {
    isOpen,
    open,
    close,
    toggle,
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      close();
    }
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
};

interface ModalTriggerProps {
  children: ReactNode;
  asChild?: boolean;
  className?: string;
}

const ModalTrigger = ({ children, asChild, className }: ModalTriggerProps) => {
  const { open } = useModalContext();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void; className?: string }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        open();
        child.props.onClick?.(e);
      },
      className: classNames(child.props.className, className),
    });
  }

  return (
    <button
      type="button"
      onClick={open}
      className={classNames(styles.trigger, className)}
    >
      {children}
    </button>
  );
};

interface ModalContentProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
}

const ModalContent = ({ children, className, size = 'md', padding = 'md' }: ModalContentProps) => {
  const { isOpen, close } = useModalContext();
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={styles.overlay} onClick={(e) => {
      if (e.target === e.currentTarget) {
        close();
      }
    }}>
      <div
        ref={contentRef}
        className={classNames(
          styles.modal,
          styles[`modal-${size}`],
          styles[`modal-padding-${padding}`],
          className
        )}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
};

interface ModalHeaderProps {
  children: ReactNode;
  className?: string;
}

const ModalHeader = ({ children, className }: ModalHeaderProps) => {
  return (
    <div className={classNames(styles.header, className)}>
      {children}
    </div>
  );
};

interface ModalTitleProps {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const ModalTitle = ({ children, className, as: Component = 'h2' }: ModalTitleProps) => {
  return (
    <Component className={classNames(styles.title, className)}>
      {children}
    </Component>
  );
};

// ModalDescription - description component
interface ModalDescriptionProps {
  children: ReactNode;
  className?: string;
}

const ModalDescription = ({ children, className }: ModalDescriptionProps) => {
  return (
    <p className={classNames(styles.description, className)}>
      {children}
    </p>
  );
};

interface ModalCloseProps {
  children?: ReactNode;
  className?: string;
  asChild?: boolean;
}

const ModalClose = ({ children, className, asChild }: ModalCloseProps) => {
  const { close } = useModalContext();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void; className?: string }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        close();
        child.props.onClick?.(e);
      },
      className: classNames(child.props.className, className),
    });
  }

  return (
    <button
      type="button"
      onClick={close}
      className={classNames(styles.close, className)}
      aria-label="Close modal"
    >
      {children || <CloseIcon width={28} height={28} color="#000000" />}
    </button>
  );
};

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

const ModalBody = ({ children, className }: ModalBodyProps) => {
  return (
    <div className={classNames(styles.body, className)}>
      {children}
    </div>
  );
};

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

const ModalFooter = ({ children, className }: ModalFooterProps) => {
  return (
    <div className={classNames(styles.footer, className)}>
      {children}
    </div>
  );
};

ModalBase.Trigger = ModalTrigger;
ModalBase.Content = ModalContent;
ModalBase.Header = ModalHeader;
ModalBase.Title = ModalTitle;
ModalBase.Description = ModalDescription;
ModalBase.Close = ModalClose;
ModalBase.Body = ModalBody;
ModalBase.Footer = ModalFooter;

export default ModalBase;
