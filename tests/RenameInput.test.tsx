import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RenameInput } from '../src/components/RenameInput';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const renderInput = (value: string, onCommit: (next: string) => void) => {
  act(() => { root.render(<RenameInput value={value} onCommit={onCommit} ariaLabel="名称" />); });
  const input = container.querySelector('input');
  if (!input) throw new Error('input not rendered');
  return input;
};

const setNativeValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (!setter) throw new Error('value setter missing');
  setter.call(input, value);
};

const typeText = (input: HTMLInputElement, value: string) => {
  act(() => {
    setNativeValue(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const pressEnter = (input: HTMLInputElement) => {
  act(() => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
};

const fireComposition = (input: HTMLInputElement, type: 'compositionstart' | 'compositionend') => {
  act(() => { input.dispatchEvent(new Event(type, { bubbles: true })); });
};

describe('RenameInput', () => {
  it('follows typing as a draft and only commits on blur', () => {
    const onCommit = vi.fn();
    const input = renderInput('分享舞台', onCommit);
    act(() => { input.focus(); });
    typeText(input, '主舞台');
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('主舞台');
    act(() => { input.blur(); });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('主舞台');
  });

  it('commits on Enter and trims surrounding whitespace', () => {
    const onCommit = vi.fn();
    const input = renderInput('分享舞台', onCommit);
    act(() => { input.focus(); });
    typeText(input, '  中央舞台  ');
    pressEnter(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('中央舞台');
  });

  it('allows clearing mid-edit and restores the committed name on blur', () => {
    const onCommit = vi.fn();
    const input = renderInput('分享舞台', onCommit);
    act(() => { input.focus(); });
    typeText(input, '');
    expect(input.value).toBe('');
    act(() => { input.blur(); });
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('分享舞台');
  });

  it('treats a whitespace-only name as empty and keeps the old name', () => {
    const onCommit = vi.fn();
    const input = renderInput('分享舞台', onCommit);
    act(() => { input.focus(); });
    typeText(input, '   ');
    act(() => { input.blur(); });
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('分享舞台');
  });

  it('commits a pasted long name in full', () => {
    const onCommit = vi.fn();
    const input = renderInput('分享舞台', onCommit);
    const longName = `超长的展位名称${'一二三四五六七八九十'.repeat(10)}`;
    act(() => { input.focus(); });
    typeText(input, longName);
    act(() => { input.blur(); });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(longName);
  });

  it('does not commit while composing with an IME, even when Enter is pressed', () => {
    const onCommit = vi.fn();
    const input = renderInput('分享舞台', onCommit);
    act(() => { input.focus(); });
    fireComposition(input, 'compositionstart');
    typeText(input, 'zhongyang');
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('zhongyang');
    pressEnter(input);
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('zhongyang');
    setNativeValue(input, '中央舞台');
    fireComposition(input, 'compositionend');
    expect(input.value).toBe('中央舞台');
    expect(onCommit).not.toHaveBeenCalled();
    pressEnter(input);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('中央舞台');
  });

  it('settles the composed text when focus leaves mid-composition', () => {
    const onCommit = vi.fn();
    const input = renderInput('分享舞台', onCommit);
    act(() => { input.focus(); });
    fireComposition(input, 'compositionstart');
    typeText(input, 'wutai');
    setNativeValue(input, '舞台');
    fireComposition(input, 'compositionend');
    act(() => { input.blur(); });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('舞台');
  });

  it('shows the latest committed value when it changes while not editing', () => {
    const onCommit = vi.fn();
    const input = renderInput('香氛展位', onCommit);
    expect(input.value).toBe('香氛展位');
    act(() => { root.render(<RenameInput value="手作展位" onCommit={onCommit} ariaLabel="名称" />); });
    expect(input.value).toBe('手作展位');
  });

  it('does not commit when the name is unchanged', () => {
    const onCommit = vi.fn();
    const input = renderInput('分享舞台', onCommit);
    act(() => { input.focus(); });
    typeText(input, '分享舞台');
    act(() => { input.blur(); });
    expect(onCommit).not.toHaveBeenCalled();
  });
});
