"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createStyleGuide } from "./actions";
import { brandInkButtonClassName, brandInkButtonStyle } from "@/lib/ui/button-classes";

type CreateGuideButtonProps = {
  className?: string;
  style?: CSSProperties;
  label?: string;
  creatingLabel?: string;
  children?: ReactNode;
};

export function CreateGuideButton({
  className,
  style,
  label = "New Style Guide",
  creatingLabel = "Creating...",
  children,
}: CreateGuideButtonProps = {}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (isCreating) return;
    setIsCreating(true);
    const formData = new FormData();
    formData.append("name", "New Style Guide");

    try {
      const guide = await createStyleGuide(formData);
      if (guide?.id) {
        router.push(`/style-guide/${guide.id}?tab=ai-import`);
        return;
      }
      alert("Failed to create style guide");
    } catch (error) {
      console.error("Failed to create guide", error);
      alert("Failed to create style guide");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={isCreating}
      className={
        className ??
        `${brandInkButtonClassName} px-4 py-2 text-sm disabled:opacity-50`
      }
      style={style ?? brandInkButtonStyle}
    >
      {children ?? (
        <>
          <Plus className="w-4 h-4" aria-hidden="true" />
          {isCreating ? creatingLabel : label}
        </>
      )}
    </button>
  );
}
