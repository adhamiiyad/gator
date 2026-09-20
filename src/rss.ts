import { XMLParser } from "fast-xml-parser";

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.statusText}`);
  }

  const xmlData = await response.text();

  const parser = new XMLParser({
    processEntities: false,
  });

  const parsed = parser.parse(xmlData);

  if (!parsed.rss || !parsed.rss.channel) {
    throw new Error("Invalid RSS feed format: channel missing");
  }

  const channelData = parsed.rss.channel;

  if (
    typeof channelData.title !== "string" ||
    typeof channelData.link !== "string" ||
    typeof channelData.description !== "string"
  ) {
    throw new Error("Invalid RSS feed metadata");
  }

  let rawItems: any[] = [];
  if (channelData.item) {
    if (Array.isArray(channelData.item)) {
      rawItems = channelData.item;
    } else if (typeof channelData.item === "object") {
      rawItems = [channelData.item];
    }
  }

  const items: RSSItem[] = [];

  for (const item of rawItems) {
    if (
      typeof item.title === "string" &&
      typeof item.link === "string" &&
      typeof item.description === "string" &&
      typeof item.pubDate === "string"
    ) {
      items.push({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate: item.pubDate,
      });
    }
  }

  return {
    channel: {
      title: channelData.title,
      link: channelData.link,
      description: channelData.description,
      item: items,
    },
  };
}