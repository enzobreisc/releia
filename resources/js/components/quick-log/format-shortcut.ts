const SHORTCUT_SYMBOLS: Record<string, string> = {
    CmdOrCtrl: '⌘',
    Cmd: '⌘',
    Command: '⌘',
    Ctrl: '⌃',
    Control: '⌃',
    Alt: '⌥',
    Option: '⌥',
    Shift: '⇧',
};

const MODIFIER_ORDER = ['⌃', '⌥', '⇧', '⌘'];

/** "CmdOrCtrl+Shift+L" becomes "⇧⌘L", as macOS shows it in menus. */
export function formatShortcut(shortcut: string) {
    const parts = shortcut.split('+');
    const key = parts.pop() ?? '';
    const modifiers = parts
        .map((part) => SHORTCUT_SYMBOLS[part] ?? part)
        .sort((a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b));

    return `${modifiers.join('')}${key.toUpperCase()}`;
}
