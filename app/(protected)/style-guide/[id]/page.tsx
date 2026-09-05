import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { selfReferencingCanonical } from "@/lib/seo/site-metadata";
import { InferSelectModel } from "drizzle-orm";
import { getStyleGuide, getDictionaryEntries } from "../actions";
import { dictionaryEntries } from "@/lib/db/schema";
import { StyleGuideEditor } from "./style-guide-editor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return selfReferencingCanonical(`/style-guide/${id}`);
}

export default async function EditStyleGuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  let guide;
  let dictionary: InferSelectModel<typeof dictionaryEntries>[];

  try {
    guide = await getStyleGuide(id);
  } catch (error) {
    console.error("Error fetching style guide:", error);
    notFound();
  }

  if (!guide) {
    notFound();
  }

  try {
    dictionary = await getDictionaryEntries(id);
  } catch (error) {
    console.error("Error fetching dictionary entries:", error);
    dictionary = [];
  }

  return (
    <div className="ui-style-shell min-h-screen">
      <StyleGuideEditor
        guide={guide}
        initialDictionary={dictionary}
        initialTab={tab === "ai-import" ? "ai-import" : "overview"}
      />
    </div>
  );
}
