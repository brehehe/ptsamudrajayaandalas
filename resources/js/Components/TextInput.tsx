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
                'rounded-md border-gray-300 dark:border-[#1E3A5F] bg-white dark:bg-[#0C1D36] ' +
                'text-gray-900 dark:text-[#F1F5F9] placeholder-gray-400 ' +
                'dark:placeholder-gray-500 shadow-sm focus:border-indigo-500 ' +
                'focus:ring-indigo-500 ' +
                className
            }
            ref={localRef}
        />
    );
});
