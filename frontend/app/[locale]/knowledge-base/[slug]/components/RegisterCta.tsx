import { Button } from '@/components/new-button';
import styles from './RegisterCta.module.scss';

type Props = { href: string };

export default function RegisterCta({ href }: Props) {
  return (
    <Button href={href} variant="fill" intent="gradient" size="lg" className={styles.cta}>
      Зарегистрироваться бесплатно
    </Button>
  );
}
