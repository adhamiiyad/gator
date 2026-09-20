import { readConfig, setUser } from "./config.js";
import { createUser, deleteUsers, getUserByName, getUsers } from "./lib/db/queries/users.js";
import { fetchFeed } from "./rss.js";
import { Feed, User } from "./lib/db/schema.js";
import { createFeed, getFeedByUrl } from "./lib/db/queries/feeds.js";
import { getFeeds } from "./lib/db/queries/feeds.js";
import { createFeedFollow, deleteFeedFollow, getFeedFollowsForUser, getNextFeedToFetch, markFeedFetched } from "./lib/db/queries/feedFollows.js";
import { createPost, getPostsForUser } from "./lib/db/queries/posts.js";


export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

// Middleware higher-order function
export function middlewareLoggedIn(
  handler: UserCommandHandler
): (cmdName: string, ...args: string[]) => Promise<void> {
  return async (cmdName: string, ...args: string[]): Promise<void> => {
    const config = readConfig();
    const currentUserName = config.currentUserName;

    if (!currentUserName) {
      throw new Error("No user currently logged in");
    }

    const user = await getUserByName(currentUserName);
    if (!user) {
      throw new Error(`User ${currentUserName} not found in database`);
    }

    await handler(cmdName, user, ...args);
  };
}

export type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

export async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("a username is required");
  }

  const username = args[0];
  const existingUser = await getUserByName(username);

  if (!existingUser) {
    throw new Error(`User ${username} does not exist`);
  }

  setUser(username);
  console.log(`User set to ${username}`);
}

export async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error("a name is required");
  }

  const name = args[0];
  const existingUser = await getUserByName(name);

  if (existingUser) {
    throw new Error(`User ${name} already exists`);
  }

  const newUser = await createUser(name);
  setUser(name);

  console.log(`User created: ${name}`);
  console.log(newUser);
}

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler
): void {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];
  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }

  await handler(cmdName, ...args);
}

export async function handlerReset(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  await deleteUsers();
  console.log("Database successfully reset.");
}

export async function handlerUsers(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const allUsers = await getUsers();
  const config = readConfig();
  const currentUser = config.currentUserName;

  for (const user of allUsers) {
    if (user.name === currentUser) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}

export async function handlerAgg(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error("time_between_reqs argument is required (e.g. 1m, 1s)");
  }

  const durationStr = args[0];
  const timeBetweenRequests = parseDuration(durationStr);

  console.log(`Collecting feeds every ${durationStr}`);

  const handleError = (err: unknown) => {
    if (err instanceof Error) {
      console.error(`Error scraping feed: ${err.message}`);
    } else {
      console.error("Unknown error scraping feed");
    }
  };

  // Run immediately on start
  scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  // Keep process alive and gracefully exit on SIGINT
  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("\nShutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}



export function printFeed(feed: Feed, user: User): void {
  console.log(`* ID:            ${feed.id}`);
  console.log(`* Created:       ${feed.createdAt}`);
  console.log(`* Updated:       ${feed.updatedAt}`);
  console.log(`* Name:          ${feed.name}`);
  console.log(`* URL:           ${feed.url}`);
  console.log(`* User:          ${user.name}`);
}

export async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error("feed name and URL are required");
  }

  const [name, url] = args;
  const newFeed = await createFeed(name, url, user.id);
  const feedFollow = await createFeedFollow(user.id, newFeed.id);

  printFeed(newFeed, user);
  console.log(`Feed follow created for user ${feedFollow.userName} on feed ${feedFollow.feedName}`);
}

export async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error("feed URL is required");
  }

  const [url] = args;
  const feed = await getFeedByUrl(url);
  if (!feed) {
    throw new Error(`Feed with URL ${url} not found`);
  }

  const feedFollow = await createFeedFollow(user.id, feed.id);
  console.log(`User: ${feedFollow.userName}`);
  console.log(`Feed: ${feedFollow.feedName}`);
}

export async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const follows = await getFeedFollowsForUser(user.id);

  for (const follow of follows) {
    console.log(`* ${follow.feedName}`);
  }
}

export async function handlerListFeeds(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const feedList = await getFeeds();

  for (const feed of feedList) {
    console.log(`* Name: ${feed.name}`);
    console.log(`* URL:  ${feed.url}`);
    console.log(`* User: ${feed.userName}`);
    console.log("");
  }
}

export const handlerUnfollow: UserCommandHandler = async (
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> => {
  if (args.length < 1) {
    throw new Error("feed URL is required");
  }

  const [url] = args;
  await deleteFeedFollow(user.id, url);
  console.log(`Successfully unfollowed feed at URL: ${url}`);
};

export function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error("Invalid duration format. Use e.g. 1s, 100ms, 1m, 1h");
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error("Invalid duration unit");
  }
}

export async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();
  if (!feed) {
    return;
  }

  await markFeedFetched(feed.id);

  console.log(`Fetching feed: ${feed.name} (${feed.url})`);
  const feedData = await fetchFeed(feed.url);

  for (const item of feedData.channel.item) {
    let publishedAt = new Date();
    if (item.pubDate) {
      const parsed = new Date(item.pubDate);
      if (!isNaN(parsed.getTime())) {
        publishedAt = parsed;
      }
    }

    try {
      await createPost({
        title: item.title,
        url: item.link,
        description: item.description || undefined,
        publishedAt,
        feedId: feed.id,
      });
    } catch (err) {
      // Ignore duplicate URL unique constraint conflicts if raised
    }
  }

  console.log(`Saved posts for ${feed.name}`);
}

export const handlerBrowse: UserCommandHandler = async (
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> => {
  let limit = 2;
  if (args.length > 0) {
    const parsedLimit = parseInt(args[0], 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      limit = parsedLimit;
    }
  }

  const userPosts = await getPostsForUser(user.id, limit);

  if (userPosts.length === 0) {
    console.log("No posts found for your followed feeds.");
    return;
  }

  for (const post of userPosts) {
    console.log(`\n--- ${post.title} ---`);
    console.log(`Published:   ${post.publishedAt}`);
    console.log(`Link:        ${post.url}`);
    if (post.description) {
      console.log(`Description: ${post.description}`);
    }
  }
};