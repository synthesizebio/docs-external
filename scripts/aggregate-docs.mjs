import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  }).trim();
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseRepos() {
  const raw = getRequiredEnv("AGGREGATE_REPOS");
  const repos = JSON.parse(raw);
  if (!Array.isArray(repos)) {
    throw new Error("AGGREGATE_REPOS must be a JSON array");
  }
  return repos;
}

function safeResolve(baseDir, ...segments) {
  const resolved = resolve(baseDir, ...segments);
  if (!resolved.startsWith(`${baseDir}/`) && resolved !== baseDir) {
    throw new Error(`Resolved path escapes base directory: ${resolved}`);
  }
  return resolved;
}

function removeDirectoryContents(directory) {
  for (const entry of readdirSync(directory)) {
    if (entry === ".git") {
      continue;
    }
    rmSync(join(directory, entry), { recursive: true, force: true });
  }
}

function copyDirectory(source, destination) {
  cpSync(source, destination, {
    recursive: true,
    force: true,
    dereference: false,
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function branchExists(remoteUrl, branch) {
  try {
    run("git", ["ls-remote", "--heads", "--exit-code", remoteUrl, branch]);
    return true;
  } catch {
    return false;
  }
}

function authUrl(owner, repo, token) {
  if (!token) {
    return `https://github.com/${owner}/${repo}.git`;
  }
  return `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
}

function prependPrefix(group, prefix) {
  return {
    ...group,
    pages: group.pages.map((entry) =>
      typeof entry === "string" ? `${prefix}/${entry}` : prependPrefix(entry, prefix),
    ),
  };
}

function mergeDocsNavigation(main, sub, prefix) {
  const merged = { ...main };

  if (sub.groups) {
    const prefixedGroups = sub.groups.map((group) => prependPrefix(group, prefix));
    merged.groups = [...(merged.groups || []), ...prefixedGroups];
  }

  if (sub.pages) {
    const prefixedPages = sub.pages.map((page) => `${prefix}/${page}`);
    merged.pages = [...(merged.pages || []), ...prefixedPages];
  }

  if (sub.languages || sub.versions || sub.tabs || sub.dropdowns || sub.anchors) {
    const fallbackGroup = {
      group: prefix,
      pages: [],
    };

    for (const collection of [sub.languages, sub.versions, sub.tabs, sub.dropdowns, sub.anchors]) {
      for (const item of collection || []) {
        if (item.pages) {
          fallbackGroup.pages.push(...item.pages.map((page) => `${prefix}/${page}`));
        }
        if (item.groups) {
          for (const group of item.groups) {
            fallbackGroup.pages.push(prependPrefix(group, prefix));
          }
        }
      }
    }

    if (fallbackGroup.pages.length > 0) {
      merged.groups = [...(merged.groups || []), fallbackGroup];
    }
  }

  return merged;
}

function cloneRepo(remoteUrl, branch, destination) {
  const args = ["clone", "--depth=1"];
  if (branch) {
    args.push("--branch", branch);
  }
  args.push(remoteUrl, destination);
  run("git", args);
}

function composeDocs({
  workDir,
  baseSourceDir,
  repos,
  pushToken,
}) {
  const composedDir = join(workDir, "composed");
  copyDirectory(baseSourceDir, composedDir);

  const baseConfigPath = join(composedDir, "docs.json");
  const baseConfig = readJson(baseConfigPath);

  for (const repo of repos) {
    const cloneDir = join(workDir, `clone-${repo.repo}`);
    const remoteUrl = authUrl(repo.owner, repo.repo, pushToken);
    cloneRepo(remoteUrl, repo.ref, cloneDir);

    const repoSourceDir = repo.subdirectory
      ? safeResolve(cloneDir, repo.subdirectory)
      : cloneDir;
    const repoConfigPath = join(repoSourceDir, "docs.json");
    if (!existsSync(repoConfigPath)) {
      throw new Error(`Subrepo docs config not found: ${repo.owner}/${repo.repo} -> ${repoConfigPath}`);
    }

    const subConfig = readJson(repoConfigPath);
    baseConfig.navigation = mergeDocsNavigation(baseConfig.navigation, subConfig.navigation, repo.repo);

    const destination = join(composedDir, repo.repo);
    copyDirectory(repoSourceDir, destination);
  }

  writeJson(baseConfigPath, baseConfig);
  return composedDir;
}

function prepareTargetCheckout({
  workDir,
  owner,
  repo,
  branch,
  pushToken,
}) {
  const destination = join(workDir, "target");
  const remoteUrl = authUrl(owner, repo, pushToken);

  if (branchExists(remoteUrl, branch)) {
    cloneRepo(remoteUrl, branch, destination);
  } else {
    cloneRepo(remoteUrl, undefined, destination);
    run("git", ["-C", destination, "checkout", "--orphan", branch]);
  }

  return { destination, remoteUrl };
}

function stageAndCommit(targetDir) {
  run("git", ["-C", targetDir, "add", "-A"]);

  try {
    run("git", ["-C", targetDir, "diff", "--cached", "--quiet"]);
    return false;
  } catch {
    run("git", ["-C", targetDir, "config", "user.name", "Mintlify Docs Bot"]);
    run("git", ["-C", targetDir, "config", "user.email", "support@synthesize.bio"]);
    run("git", ["-C", targetDir, "commit", "-m", "update aggregated docs"]);
    return true;
  }
}

function pushBranch(targetDir, branch) {
  run("git", ["-C", targetDir, "push", "origin", `HEAD:${branch}`], {
    stdio: "inherit",
  });
}

function main() {
  const repos = parseRepos();
  const pushToken = process.env.PUSH_TOKEN || "";
  const targetBranch = process.env.TARGET_BRANCH || "docs";
  const targetRepository = process.env.TARGET_REPOSITORY || process.env.GITHUB_REPOSITORY;
  const baseSubdirectory = process.env.BASE_SUBDIRECTORY || ".";
  const dryRun = process.env.DRY_RUN === "1";

  if (!targetRepository) {
    throw new Error("Missing TARGET_REPOSITORY or GITHUB_REPOSITORY");
  }

  const [targetOwner, targetRepo] = targetRepository.split("/");
  if (!targetOwner || !targetRepo) {
    throw new Error(`Invalid target repository: ${targetRepository}`);
  }

  const workspaceDir = process.cwd();
  const baseSourceDir = safeResolve(workspaceDir, baseSubdirectory);
  const tempRoot = mkdtempSync(join(tmpdir(), "docs-external-aggregate-"));

  const composedDir = composeDocs({
    workDir: tempRoot,
    baseSourceDir,
    repos,
    pushToken,
  });

  if (dryRun) {
    console.log(`Dry run complete. Composed docs at ${composedDir}`);
    return;
  }

  const { destination: targetDir } = prepareTargetCheckout({
    workDir: tempRoot,
    owner: targetOwner,
    repo: targetRepo,
    branch: targetBranch,
    pushToken,
  });

  removeDirectoryContents(targetDir);
  copyDirectory(composedDir, targetDir);

  if (!stageAndCommit(targetDir)) {
    console.log("No aggregated docs changes detected.");
    return;
  }

  pushBranch(targetDir, targetBranch);
}

main();
