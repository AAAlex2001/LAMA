export type ButtonTypeOption = 'url' | 'hidden_text' | 'callback';

export interface ButtonTypeContentProps {
  buttonTypeValue: ButtonTypeOption;
  onButtonTypeChange?: (value: ButtonTypeOption) => void;
}
