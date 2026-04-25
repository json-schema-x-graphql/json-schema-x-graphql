import type { NextSeoProps } from "next-seo";

export const SEO: NextSeoProps = {
  title: "GSA Enterprise Schema Unification Forest | Government Contract Data Visualizer",
  description:
    "GSA Technology Transformation Services (TTS) Schema Unification Forest project provides interactive visualization tools for government contract data from Contract Data, Legacy Procurement, and EASi systems. Explore normalized contract records and unified data schemas.",
  themeColor: "#202842",
  openGraph: {
    type: "website",
    images: [
      {
        url: "/assets/diagram.svg",
        width: 1200,
        height: 627,
      },
    ],
  },
  twitter: {
    handle: "@USGSA",
    cardType: "summary_large_image",
  },
  additionalLinkTags: [
    {
      rel: "manifest",
      href: "/manifest.json",
    },
    {
      rel: "icon",
      href: "/favicon.ico",
      sizes: "48x48",
    },
  ],
};
