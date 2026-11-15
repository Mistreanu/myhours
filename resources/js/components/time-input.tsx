import { Input } from '@/components/ui/input';
import { parseTimeInput, stepTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

interface Props {
    id?: string;
    /** "HH:mm" in 24-hour format. */
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    className?: string;
}

/**
 * Always-24-hour time field. The browser's own <input type="time"> shows AM/PM or 24h
 * depending on the OS/browser language, so this is a text field that understands
 * "8", "830", "17:30", "8.30" … and ↑/↓ to move by 15 minutes.
 */
export function TimeInput({ id, value, onChange, required, className }: Props) {
    const [draft, setDraft] = useState(value);
    const [invalid, setInvalid] = useState(false);
    const focused = useRef(false);

    // Follow outside changes (e.g. the duration field moving the end time) unless the user is typing.
    useEffect(() => {
        if (!focused.current) setDraft(value);
    }, [value]);

    const commit = () => {
        const parsed = parseTimeInput(draft);
        if (parsed) {
            setDraft(parsed);
            if (parsed !== value) onChange(parsed);
        } else {
            setDraft(value);
        }
        setInvalid(false);
    };

    return (
        <Input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:mm"
            maxLength={5}
            required={required}
            value={draft}
            title="24-hour time, e.g. 08:30, 830 or 17. Use ↑/↓ to change by 15 minutes."
            aria-invalid={invalid || undefined}
            className={cn('tabular-nums', invalid && 'border-red-500', className)}
            onFocus={(e) => {
                focused.current = true;
                e.target.select();
            }}
            onChange={(e) => {
                const text = e.target.value;
                setDraft(text);
                // Keep the form (duration, amount) in sync while typing whenever the text is a valid time.
                const parsed = parseTimeInput(text);
                setInvalid(text.trim() !== '' && parsed === null);
                if (parsed) onChange(parsed);
            }}
            onBlur={() => {
                focused.current = false;
                commit();
            }}
            onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = stepTime(parseTimeInput(draft) ?? value, e.key === 'ArrowUp' ? 1 : -1);
                    setDraft(next);
                    setInvalid(false);
                    onChange(next);
                } else if (e.key === 'Enter') {
                    commit();
                }
            }}
        />
    );
}
