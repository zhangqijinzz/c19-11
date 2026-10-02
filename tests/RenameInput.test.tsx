import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RenameInput } from '../src/components/RenameInput';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<() => void> = [];

const mount = (value: string) => {
  const onCommit = vi.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (nextValue: string) => {
    act(() => { root.render(<RenameInput aria-label="名称" value={nextValue} onCommit={onCommit} />); });
  };
  render(value);
  const input = container.querySelector('input');
  if (!input) throw new Error('input not rendered');
  mounted.push(() => { act(() => root.unmount()); container.remove(); });
  return { input, onCommit, render };
};

const type = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  act(() => { input.dispatchEvent(new window.Event('input', { bubbles: true })); });
};

const keyDown = (input: HTMLInputElement, key: string) => {
  act(() => { input.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true })); });
};

const composition = (input: HTMLInputElement, phase: 'start' | 'end') => {
  act(() => { input.dispatchEvent(new window.Event(`composition${phase}`, { bubbles: true })); });
};

afterEach(() => {
  while (mounted.length) mounted.pop()?.();
});

describe('RenameInput', () => {
  it('follows typing without committing until Enter', () => {
    const { input, onCommit } = mount('旧名字');
    input.focus();
    type(input, '新名字');
    expect(input.value).toBe('新名字');
    expect(onCommit).not.toHaveBeenCalled();
    keyDown(input, 'Enter');
    expect(onCommit).toHaveBeenCalledWith('新名字');
  });

  it('commits a trimmed pasted long name on blur', () => {
    const { input, onCommit } = mount('旧名字');
    input.focus();
    type(input, '   粘贴进来的特别特别长的展位名称   ');
    act(() => { input.blur(); });
    expect(onCommit).toHaveBeenCalledWith('粘贴进来的特别特别长的展位名称');
  });

  it('restores the committed name when the draft is cleared to empty', () => {
    const { input, onCommit } = mount('旧名字');
    input.focus();
    type(input, '');
    expect(input.value).toBe('');
    act(() => { input.blur(); });
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('旧名字');
  });

  it('restores the committed name when the draft is only whitespace', () => {
    const { input, onCommit } = mount('旧名字');
    input.focus();
    type(input, '   ');
    keyDown(input, 'Enter');
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('旧名字');
  });

  it('does not commit while an IME composition is still active', () => {
    const { input, onCommit } = mount('旧名字');
    input.focus();
    composition(input, 'start');
    type(input, 'zhuti');
    keyDown(input, 'Enter');
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    composition(input, 'end');
    type(input, '主题舞台');
    keyDown(input, 'Enter');
    expect(onCommit).toHaveBeenCalledWith('主题舞台');
  });

  it('discards the draft on Escape', () => {
    const { input, onCommit } = mount('旧名字');
    input.focus();
    type(input, '写到一半');
    keyDown(input, 'Escape');
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('旧名字');
  });

  it('shows the latest committed value when it changes while not editing', () => {
    const { input, render } = mount('旧名字');
    expect(input.value).toBe('旧名字');
    render('外部新名字');
    expect(input.value).toBe('外部新名字');
  });
});
