import { FC } from "react";
import ListElement from "./components/ListElement";
import styles from "./styles.module.scss";
import ListHeader from "./components/ListHeader";

interface InboxListProps {
  data: any[];
}

const InboxList: FC<InboxListProps> = ( { data } ) => {
  return (
    <div className={styles.container}>
      <ListHeader type="all" />
      <div className={styles.list}>
        {data.map((item) => (
          <ListElement key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

export default InboxList;