import { forwardRef, InputHTMLAttributes, useEffect, useImperativeHandle, useRef } from 'react';

export default forwardRef(function TextInput(
    {
        type = 'text',
        className = '',
        isFocused = false,
        ...props
    }: InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean },
    ref
) {
    const localRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'h-11 w-full rounded-xl border-[#DCEAF8] bg-white px-3 text-sm ' +
                'text-[#0B1F63] placeholder-[#8C9BB9] shadow-sm dark:border-[#1E3A5F] ' +
                'dark:bg-[#0C1D36] dark:text-[#F1F5F9] dark:placeholder-[#64748B] ' +
                'focus:border-[#0060F4] focus:ring-[#0060F4]/25 ' +
                className
            }
            ref={localRef}
        />
    );
});
