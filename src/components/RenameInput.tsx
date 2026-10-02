import { useEffect, useRef, useState } from 'react';
import type { CompositionEvent, FocusEvent, KeyboardEvent } from 'react';

interface RenameInputProps {
  /** 已落定的名称 */
  value: string;
  /** 落定回调，仅在校验通过（非空、有变化）时触发，入参已 trim */
  onCommit: (next: string) => void;
  ariaLabel: string;
}

/**
 * 改名输入框：编辑期间只跟随本地草稿，失焦或回车时才把结果落定。
 * - 中文输入法组合（composition）期间不触发落定，回车选词不会误保存；
 * - 编辑中途允许清空、粘贴长文本，落定前不做任何干预；
 * - 落定时内容为空白则回退到落定前的名称；
 * - 未在编辑时跟随外部值（切换元素、恢复示例布局等）。
 */
export function RenameInput({ value, onCommit, ariaLabel }: RenameInputProps) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const composingRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  const settle = (raw: string) => {
    const next = raw.trim();
    if (next && next !== value) onCommit(next);
    setDraft(next || value);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setEditing(false);
    settle(event.currentTarget.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    if (composingRef.current || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.blur();
  };

  const handleCompositionStart = () => {
    composingRef.current = true;
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false;
    setDraft(event.currentTarget.value);
  };

  return <input
    aria-label={ariaLabel}
    value={editing ? draft : value}
    onFocus={() => setEditing(true)}
    onChange={(event) => setDraft(event.target.value)}
    onCompositionStart={handleCompositionStart}
    onCompositionEnd={handleCompositionEnd}
    onKeyDown={handleKeyDown}
    onBlur={handleBlur}
  />;
}
