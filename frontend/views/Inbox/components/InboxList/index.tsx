import { FC, useState } from "react";
import ListElement from "./components/ListElement";
import styles from "./styles.module.scss";
import ListHeader, { ListHeaderType } from "./components/ListHeader";

interface InboxListProps {
  data: any[];
  type: ListHeaderType;

}

const InboxList: FC<InboxListProps> = ( { data, type } ) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const handleCheck = (id: string) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(id)) {
      newCheckedItems.delete(id);
    } else {
      newCheckedItems.add(id);
    }
    setCheckedItems(newCheckedItems);
  }
  const handleSelectAll = () => {
    const allIds = new Set(data.map(item => item.id.toString()));
    const allSelected = allIds.size > 0 && allIds.size === checkedItems.size && 
      Array.from(allIds).every(id => checkedItems.has(id));
    
    if (allSelected) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(allIds);
      if (!isChecking) {
        setIsChecking(true);
      }
    }
  }
  return (
    <div className={styles.container}>
      <ListHeader type={type} setIsChecking={setIsChecking} isChecking={isChecking} onSelectAll={handleSelectAll}/>
      <div className={styles.list}>
        {data.map((item) => (
          <ListElement 
            key={item.id} 
            item={item} 
            isChecked={isChecking ? checkedItems.has(item.id.toString()) : undefined} 
            onCheck={() => handleCheck(item.id.toString())} 
          />
        ))}
      </div>
    </div>
  )
}

export default InboxList;