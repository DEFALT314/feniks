"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

// Password field with a "Pokaż/Ukryj" toggle inside the field (design/makiety/Logowanie.dc.html)
function PasswordInput({ className, id, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        className={cn("pr-28", className)}
      />
      <button
        type="button"
        aria-controls={id}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="bg-navy-soft text-navy hover:text-navy-strong absolute inset-y-1.5 right-1.5 min-w-11 cursor-pointer rounded-lg px-3.5 text-base font-bold"
      >
        {visible ? "Ukryj" : "Pokaż"}
        <span className="sr-only"> hasło</span>
      </button>
    </div>
  );
}

export { PasswordInput };
