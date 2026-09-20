import {
  CommandsRegistry,
  handlerAddFeed,
  handlerAgg,
  handlerBrowse,
  handlerFollow,
  handlerFollowing,
  handlerListFeeds,
  handlerLogin,
  handlerRegister,
  handlerReset,
  handlerUnfollow,
  handlerUsers,
  middlewareLoggedIn,
  registerCommand,
  runCommand,
} from "./commands.js";

async function main() {
  const registry: CommandsRegistry = {};

  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);
  registerCommand(registry, "feeds", handlerListFeeds);

  // Authenticated routes wrapped with middlewareLoggedIn
  registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));
  registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
  registerCommand(registry, "following", middlewareLoggedIn(handlerFollowing));
  registerCommand(registry, "unfollow", middlewareLoggedIn(handlerUnfollow));
  registerCommand(registry, "browse", middlewareLoggedIn(handlerBrowse));

  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0) {
    console.error("Not enough arguments provided.");
    process.exit(1);
  }

  const [cmdName, ...cmdArgs] = rawArgs;

  try {
    await runCommand(registry, cmdName, ...cmdArgs);
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
    } else {
      console.error("An unknown error occurred.");
    }
    process.exit(1);
  }

  process.exit(0);
}

main();