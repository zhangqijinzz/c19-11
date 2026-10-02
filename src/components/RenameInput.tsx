import { useRef, useState } from 'react';
import type { FocusEvent, InputHTMLAttributes, KeyboardEvent } from 'react';

interface RenameInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'onKeyDown' | 'onCompositionStart' | 'onCompositionEnd'> {
  value: string;
  onCommit: (name: string) => void;
}

/**
 * 草稿式重命名输入框：编辑期间只跟随用户输入，失焦或回车时才把
 * trim 后的非空名称落定；清空、纯空格或 Escape 都会放弃草稿并还原。
 * IME 组合（中文输入法）期间不触发提交，组合确认后的回车才落定。
 */
export function RenameInput({ value, onCommit, ...rest }: RenameInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const composingRef = useRef(false);
  const cancelRef = useRef(false);

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (cancelRef.current) {
      cancelRef.current = false;
      setDraft(null);
      return;
    }
    const name = event.currentTarget.value.trim();
    setDraft(null);
    if (name && name !== value) onCommit(name);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (composingRef.current || event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      cancelRef.current = true;
      event.currentTarget.blur();
    }
  };

  return (
    <input
      {...rest}
      value={draft ?? value}
      onChange={(event) => setDraft(event.target.value)}
      onCompositionStart={() => { composingRef.current = true; }}
      onCompositionEnd={(event) => { composingRef.current = false; setDraft(event.currentTarget.value); }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
