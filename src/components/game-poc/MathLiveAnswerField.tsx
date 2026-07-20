"use client";

import { useEffect, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";
import "mathlive/fonts.css";

type MathLiveAnswerFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  resetKey: string;
  disabled?: boolean;
  className?: string;
};

export function MathLiveAnswerField({ value, onValueChange, resetKey, disabled = false, className }: MathLiveAnswerFieldProps) {
  const fieldRef = useRef<MathfieldElement>(null);
  const initialValueRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  useEffect(() => {
    let active = true;
    let removeInputListener: () => void = () => undefined;
    void import("mathlive").then(({ MathfieldElement }) => {
      MathfieldElement.soundsDirectory = null;
      if (!active || !fieldRef.current) return;
      fieldRef.current.mathVirtualKeyboardPolicy = "auto";
      fieldRef.current.smartFence = true;
      fieldRef.current.value = initialValueRef.current;
      const field = fieldRef.current;
      const handleInput = () => onValueChangeRef.current(field.value);
      field.addEventListener("input", handleInput);
      removeInputListener = () => field.removeEventListener("input", handleInput);
      setReady(true);
    });
    return () => {
      active = false;
      removeInputListener();
    };
  }, []);

  useEffect(() => {
    if (fieldRef.current && fieldRef.current.value !== value) fieldRef.current.value = value;
  }, [resetKey, value]);

  return (
    <div className={className} data-mathlive-ready={ready ? "true" : "false"}>
      <math-field
        ref={fieldRef}
        aria-label="수학 답 입력"
        math-virtual-keyboard-policy="auto"
        smart-fence="true"
        readOnly={disabled}
      />
      {!ready && <span role="status">수식 키보드 준비 중…</span>}
    </div>
  );
}
