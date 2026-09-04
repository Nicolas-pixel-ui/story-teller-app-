"use client";

import { useEffect, useRef, useState } from "react";

const INK = "#1d2e3f";
const WHITE = "#ffffff";
const GOLD = "#9b7d2e";

const shellStyle = {
  colorScheme: "dark" as const,
  backgroundColor: INK,
  backgroundImage: "none",
  color: WHITE,
  WebkitTextFillColor: WHITE,
};

const activeStyle = {
  ...shellStyle,
  backgroundColor: GOLD,
  color: WHITE,
  WebkitTextFillColor: WHITE,
};

export type StyleChoice = { value: string; label: string };

export function StyleChoiceList({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: StyleChoice[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="ui-style-choice-list">
      <legend className="ui-style-choice-label">{label}</legend>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={selected ? "ui-style-choice ui-style-choice-active" : "ui-style-choice"}
              style={selected ? activeStyle : shellStyle}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BraveMenuSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: StyleChoice[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <p className="ui-style-choice-label">{label}</p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="ui-style-choice w-full"
        style={shellStyle}
      >
        {selected?.label || placeholder}
      </button>
      {open ? (
        <ul className="ui-style-choice-menu" style={shellStyle}>
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={isActive ? "ui-style-choice ui-style-choice-active" : "ui-style-choice"}
                  style={isActive ? activeStyle : shellStyle}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
