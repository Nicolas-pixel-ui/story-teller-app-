"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createStyleGuide } from "./actions";
import { brandInkButtonClassName, brandInkButtonStyle } from "@/lib/ui/button-classes";

export function CreateGuideButton() {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    const formData = new FormData();
    formData.append("name", "New Style Guide");
    
    try {
      await createStyleGuide(formData);
    } catch (error) {
      console.error("Failed to create guide", error);
      alert("Failed to create style guide");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <button
      onClick={handleCreate}
      disabled={isCreating}
      className={`${brandInkButtonClassName} px-4 py-2 text-sm disabled:opacity-50`}
      style={brandInkButtonStyle}
    >
      <Plus className="w-4 h-4" />
      {isCreating ? "Creating..." : "New Style Guide"}
    </button>
  );
}




