import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicStyleGuideByToken } from "@/lib/style-guide/queries";
import { PublicStyleGuideView } from "./public-style-guide-view";
import { styleGuideDisplayName } from "@/lib/style-guide/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const result = await getPublicStyleGuideByToken(token);
  if (!result) {
    return { title: "Style guide", robots: { index: false, follow: false } };
  }
  const title = styleGuideDisplayName(result.guide);
  return {
    title,
    description: result.guide.tagline || result.guide.missionStatement || `${result.guide.clientOrBrandName} style guide`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicStyleGuidePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicStyleGuideByToken(token);
  if (!result) notFound();

  return <PublicStyleGuideView guide={result.guide} dictionary={result.dictionary} />;
}
