import Button from "@/components/button/button";
import { FC } from "react";

import styles from "./styles.module.scss";

type ListHeaderType = 'all' | 'moderation' | 'system' | 'automation';

interface ListHeaderProps {
  type: ListHeaderType;
}


const ListHeader: FC<ListHeaderProps> = ({ type }: ListHeaderProps) => {
  return (
    <div className={styles.controls}>    
      <Button text="Выбрать все" variant="inlineButton" showArrow={false} className={styles.controlButton}/>
      <Button text="Выбрать" variant="inlineButton" showArrow={false} className={styles.controlButton}/>
    </div>
  )
}

export default ListHeader;