import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../index.js";
import { feedFollows, posts } from "../schema.js";

export async function createPost(post: {
  title: string;
  url: string;
  description?: string;
  publishedAt: Date;
  feedId: string;
}) {
  const [newPost] = await db
    .insert(posts)
    .values(post)
    .onConflictDoNothing({ target: posts.url })
    .returning();

  return newPost;
}

export async function getPostsForUser(userId: string, limit: number = 2) {
  // Get all feed IDs followed by the user
  const userFollows = await db
    .select({ feedId: feedFollows.feedId })
    .from(feedFollows)
    .where(eq(feedFollows.userId, userId));

  const feedIds = userFollows.map((f) => f.feedId);

  if (feedIds.length === 0) {
    return [];
  }

  // Fetch posts from those feeds ordered by publishedAt descending
  return await db
    .select()
    .from(posts)
    .where(inArray(posts.feedId, feedIds))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}