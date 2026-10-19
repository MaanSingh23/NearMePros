import React, { useEffect, useRef } from 'react';

/**
 * One box per digit. Typing moves forward, Backspace moves back,
 * pasting a whole code fills every box, and phones can autofill from SMS/email.
 */
const OtpInput = ({ length = 6, value, onChange, onComplete, disabled = false, invalid = false, autoFocus = true }) => {
  const inputsRef = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const update = (next) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
  };

  const handleChange = (index, raw) => {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;
    // Autofill / paste into one box can bring the whole code
    if (typed.length > 1) {
      update(typed);
      inputsRef.current[Math.min(typed.length, length) - 1]?.focus();
      return;
    }
    const chars = digits.slice();
    chars[index] = typed;
    update(chars.join(''));
    if (index < length - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const chars = digits.slice();
      if (chars[index]) {
        chars[index] = '';
      } else if (index > 0) {
        chars[index - 1] = '';
        inputsRef.current[index - 1]?.focus();
      }
      onChange(chars.join('').slice(0, length));
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    e.preventDefault();
    update(pasted);
    inputsRef.current[Math.min(pasted.length, length) - 1]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputsRef.current[index] = el; }}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          aria-label={`Digit ${index + 1}`}
          className={`h-14 w-11 rounded-2xl border-2 bg-white text-center text-2xl font-black text-stone-900 outline-none transition focus:-translate-y-0.5 sm:w-12 dark:bg-stone-900 dark:text-white ${
            invalid
              ? 'border-red-400 focus:border-red-500 dark:border-red-700'
              : digit
                ? 'border-primary-400 dark:border-primary-600'
                : 'border-stone-200 focus:border-primary-500 dark:border-stone-700'
          } disabled:opacity-60`}
        />
      ))}
    </div>
  );
};

export default OtpInput;
