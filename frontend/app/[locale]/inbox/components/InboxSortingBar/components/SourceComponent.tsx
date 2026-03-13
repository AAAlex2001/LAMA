import { FC } from "react";
import Checkbox from "@/components/checkbox/checkbox";
import SearchBar from "@/components/search-bar/search-bar";
import styles from "../styles.module.scss";

export interface SourceFilterOption {
  key: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  list?: {
    searchPlaceholder: string;
    searchValue: string;
    onSearchChange: (value: string) => void;
    items: string[];
    selectedItems: Set<string>;
    onItemToggle: (item: string) => void;
    isSharedSearch?: boolean;
  };
}

export interface SourceContentProps {
  isDefault: boolean;
  onDefaultChange: (checked: boolean) => void;
  defaultLabel?: string;
  options: SourceFilterOption[];
}

const SourceContent: FC<SourceContentProps> = ({
  isDefault,
  onDefaultChange,
  defaultLabel = "По умолчанию",
  options,
}) => {
  const handleDefaultChange = (checked: boolean) => {
    onDefaultChange(checked);
    if (checked) {
      options.forEach((opt) => opt.onChange(false));
    }
  };

  return (
    <div className={styles.sourceContent}>
      <div className={styles.sourceOptions}>
        <div className={styles.sourceOption} onClick={() => handleDefaultChange(!isDefault)}>
          <Checkbox
            variant="radio"
            checked={isDefault}
            onChange={handleDefaultChange}
          />
          <span className={styles.sourceOptionLabel}>{defaultLabel}</span>
        </div>

        {options.map((opt) => (
          <div
            key={opt.key}
            className={styles.sourceOption}
            onClick={() => {
              const next = !opt.checked;
              opt.onChange(next);
              if (next) {
                onDefaultChange(false);
              }
            }}
          >
            <Checkbox
              checked={opt.checked}
              onChange={(checked) => {
                opt.onChange(checked);
                if (checked) {
                  onDefaultChange(false);
                }
              }}
            />
            <span className={styles.sourceOptionLabel}>{opt.label}</span>
          </div>
        ))}
      </div>

      {!isDefault && (() => {
        const checkedOptions = options.filter((opt) => opt.checked && opt.list);
        const hasSharedSearch = checkedOptions.some((opt) => opt.list?.isSharedSearch);
        const sharedSearchOption = checkedOptions.find((opt) => opt.list?.isSharedSearch);
        
        const seen = new Set<string>();
        const combinedItems = checkedOptions.flatMap((opt) =>
          opt.list!.items
            .filter((item) => {
              if (seen.has(item)) return false;
              seen.add(item);
              return true;
            })
            .map((item) => ({
              item,
              option: opt,
            }))
        );
        
        if (hasSharedSearch && sharedSearchOption) {
          return (
            <>
              <div className={styles.channelSearch}>
                <SearchBar
                  placeholder={sharedSearchOption.list!.searchPlaceholder}
                  value={sharedSearchOption.list!.searchValue}
                  onChange={sharedSearchOption.list!.onSearchChange}
                />
              </div>
              <div className={styles.channelList}>
                {combinedItems.map(({ item, option }) => {
                  const isSelected = option.list!.selectedItems.has(item);
                  return (
                    <div
                      key={`${option.key}-${item}`}
                      className={styles.channelItem}
                      onClick={() => {
                        option.list!.onItemToggle(item);
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {
                          option.list!.onItemToggle(item);
                        }}
                      />
                      <span className={styles.channelItemLabel}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </>
          );
        }
        
        const firstOption = checkedOptions[0];
        if (!firstOption) return null;
        
        return (
          <>
            <div className={styles.channelSearch}>
              <SearchBar
                placeholder={firstOption.list!.searchPlaceholder}
                value={firstOption.list!.searchValue}
                onChange={firstOption.list!.onSearchChange}
              />
            </div>
            <div className={styles.channelList}>
              {combinedItems.map(({ item, option }) => {
                const isSelected = option.list!.selectedItems.has(item);
                return (
                  <div
                    key={`${option.key}-${item}`}
                    className={styles.channelItem}
                    onClick={() => {
                      option.list!.onItemToggle(item);
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => {
                        option.list!.onItemToggle(item);
                      }}
                    />
                    <span className={styles.channelItemLabel}>{item}</span>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default SourceContent;