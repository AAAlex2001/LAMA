import { FC } from "react";
import classNames from "classnames";
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
        <div className={styles.sourceOption}>
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
            className={classNames(styles.sourceOption, {
              [styles.sourceOptionDisabled]: isDefault,
            })}
          >
            <Checkbox
              checked={opt.checked}
              onChange={(checked) => {
                if (!isDefault) opt.onChange(checked);
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
        
        if (hasSharedSearch && sharedSearchOption) {
          // Render shared search bar once, then render all lists
          return (
            <>
              <div className={styles.channelSearch}>
                <SearchBar
                  placeholder={sharedSearchOption.list!.searchPlaceholder}
                  value={sharedSearchOption.list!.searchValue}
                  onChange={sharedSearchOption.list!.onSearchChange}
                />
              </div>
              {checkedOptions.map((opt) => (
                <div key={`${opt.key}-list`}>
                  <div className={styles.channelList}>
                    {opt.list!.items.map((item) => {
                      const isSelected = opt.list!.selectedItems.has(item);
                      return (
                        <div
                          key={item}
                          className={styles.channelItem}
                          onClick={() => {
                            if (!isDefault) opt.list!.onItemToggle(item);
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {
                              if (!isDefault) opt.list!.onItemToggle(item);
                            }}
                          />
                          <span className={styles.channelItemLabel}>{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          );
        }
        
        // Render individual search bars for each option
        return checkedOptions.map((opt) => (
          <div key={`${opt.key}-list`}>
            <div className={styles.channelSearch}>
              <SearchBar
                placeholder={opt.list!.searchPlaceholder}
                value={opt.list!.searchValue}
                onChange={opt.list!.onSearchChange}
              />
            </div>
            <div className={styles.channelList}>
              {opt.list!.items.map((item) => {
                const isSelected = opt.list!.selectedItems.has(item);
                return (
                  <div
                    key={item}
                    className={styles.channelItem}
                    onClick={() => {
                      if (!isDefault) opt.list!.onItemToggle(item);
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => {
                        if (!isDefault) opt.list!.onItemToggle(item);
                      }}
                    />
                    <span className={styles.channelItemLabel}>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ));
      })()}
    </div>
  );
};

export default SourceContent;