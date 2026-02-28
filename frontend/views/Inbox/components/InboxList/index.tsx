import { FC, useState, useRef, useEffect } from "react";
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
  const [isLastElementVisible, setIsLastElementVisible] = useState(false);
  const lastElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lastElementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsLastElementVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '0px',
      }
    );

    observer.observe(lastElementRef.current);

    return () => {
      if (lastElementRef.current) {
        observer.unobserve(lastElementRef.current);
      }
    };
  }, [data]);

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

  const handleSetIsChanging = (isChanging: boolean) => {
    if (!isChanging) {
      setCheckedItems(new Set());
    }
    setIsChecking(isChanging);
  }

  const handleOnHold = (id: string) => {
    setIsChecking(true);
    setCheckedItems(new Set([id]));
  }

  return (
    <div className={styles.container}>
      <ListHeader 
        type={type} 
        setIsChecking={handleSetIsChanging} 
        isChecking={isChecking} 
        onSelectAll={handleSelectAll}
        isSelectedAll={checkedItems.size > 0 && checkedItems.size === data.length}
        checkedItems={checkedItems.size}
      />
      <div className={styles.list}>
        {data.map((item, index) => (
          <div 
            key={item.id} 
            ref={index === data.length - 1 ? lastElementRef : null}
          >
            <ListElement 
              item={item} 
              isChecked={isChecking ? checkedItems.has(item.id.toString()) : undefined} 
              onCheck={() => handleCheck(item.id.toString())}
              onHold={() => handleOnHold(item.id.toString())}
              type={type}
            />
          </div>
        ))}
      </div>
      {!isLastElementVisible && <div className={styles.bottomGradient} />}
    </div>
  )
}

export default InboxList;