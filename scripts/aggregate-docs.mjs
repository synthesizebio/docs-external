import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

function run(command, args, options = {}) {
  let result;
  try {
    result = execFileSync(command, args, {
      stdio: "pipe",
      encoding: "utf8",
      ...options,
    });
  } catch (error) {
    const stderr = error.stderr?.toString?.() || "";
    const redactedArgs = args
      .map((arg) =>
        arg
          .replace(/Authorization: Bearer \S+/g, "Authorization: Bearer [redacted]")
          .replace(/x-access-token:[^@]+@/g, "x-access-token:[redacted]@"),
      )
      .join(" ");

    throw new Error(`Command failed: ${command} ${redactedArgs}${stderr ? `\n${stderr}` : ""}`);
  }

  if (typeof result !== "string") {
    return "";
  }

  return result.trim();
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

const anchorByRepo = {
  platform: "MCP",
  pysynthbio: "Python SDK",
  rsynthbio: "R SDK",
};

function sourceAnchorName(prefix) {
  return anchorByRepo[prefix] || prefix;
}

function withAnchorPages(anchor, pages) {
  const { href: _href, ...anchorWithoutHref } = anchor;

  return {
    ...anchorWithoutHref,
    pages: [...(anchor.pages || []), ...pages],
  };
}

function withRootPage(group, rootPage) {
  return {
    ...group,
    root: rootPage,
    expanded: true,
    pages: group.pages.filter((page) => page !== rootPage),
  };
}

function groupsWithRootIndex(groups, prefix) {
  return groups.map((group) => {
    const rootPage = `${prefix}/index`;

    if (group.pages.includes(rootPage)) {
      return withRootPage(group, rootPage);
    }

    return group;
  });
}

function mergeIntoSourceAnchor(merged, prefix, pages) {
  const anchorName = sourceAnchorName(prefix);
  const anchorIndex = merged.anchors?.findIndex((anchor) => anchor.anchor === anchorName) ?? -1;

  if (anchorIndex === -1 || pages.length === 0) {
    return false;
  }

  merged.anchors = merged.anchors.map((anchor, index) =>
    index === anchorIndex ? withAnchorPages(anchor, pages) : anchor,
  );

  return true;
}

function mergeDocsNavigation(main, sub, prefix) {
  const merged = { ...main };

  if (sub.groups) {
    const prefixedGroups = sub.groups.map((group) => prependPrefix(group, prefix));
    const groupedPages = groupsWithRootIndex(prefixedGroups, prefix);
    if (!mergeIntoSourceAnchor(merged, prefix, groupedPages)) {
      merged.groups = [...(merged.groups || []), ...prefixedGroups];
    }
  }

  if (sub.pages) {
    const prefixedPages = sub.pages.map((page) => `${prefix}/${page}`);
    if (!mergeIntoSourceAnchor(merged, prefix, prefixedPages)) {
      merged.pages = [...(merged.pages || []), ...prefixedPages];
    }
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
      if (!mergeIntoSourceAnchor(merged, prefix, fallbackGroup.pages)) {
        merged.groups = [...(merged.groups || []), fallbackGroup];
      }
    }
  }

  return merged;
}

function cloneRepo(remoteUrl, branch, destination, options = {}) {
  const args = ["clone"];
  if (options.depth) {
    args.push(`--depth=${options.depth}`);
  }
  if (branch) {
    args.push("--branch", branch);
  }
  args.push(remoteUrl, destination);
  run("git", args);
}

function downloadRepoArchive({ owner, repo, ref, token, destination }) {
  const archivePath = join(destination, "..", `${repo}.tar.gz`);
  const archiveUrl = token
    ? `https://api.github.com/repos/${owner}/${repo}/tarball/${ref}`
    : `https://codeload.github.com/${owner}/${repo}/tar.gz/refs/heads/${ref}`;
  const curlArgs = ["-L", "--fail"];

  if (token) {
    curlArgs.push("-H", "Accept: application/vnd.github+json");
    curlArgs.push("-H", `Authorization: Bearer ${token}`);
  }

  curlArgs.push("-o", archivePath, archiveUrl);
  run("curl", curlArgs);
  run("mkdir", ["-p", destination]);
  run("tar", ["-xzf", archivePath, "-C", destination, "--strip-components=1"]);
  rmSync(archivePath, { force: true });
}

function composeDocs({
  workDir,
  baseSourceDir,
  repos,
  sourceToken,
}) {
  const composedDir = join(workDir, "composed");
  copyDirectory(baseSourceDir, composedDir);

  const baseConfigPath = join(composedDir, "docs.json");
  const baseConfig = readJson(baseConfigPath);

  for (const repo of repos) {
    const cloneDir = join(workDir, `clone-${repo.repo}`);
    downloadRepoArchive({
      owner: repo.owner,
      repo: repo.repo,
      ref: repo.ref || "main",
      token: sourceToken,
      destination: cloneDir,
    });

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
    // Clone the target branch with enough history for follow-up updates.
    cloneRepo(remoteUrl, branch, destination);
  } else {
    cloneRepo(remoteUrl, undefined, destination, { depth: 1 });
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

function pushBranch(targetDir, branch, remoteUrl) {
  // Reapply the authenticated remote URL before push because Git may scrub
  // credentials from the stored origin URL after clone.
  run("git", ["-C", targetDir, "remote", "set-url", "origin", remoteUrl]);
  run("git", ["-C", targetDir, "push", "--force-with-lease", "origin", `HEAD:${branch}`], {
    stdio: "inherit",
  });
}

function main() {
  const repos = parseRepos();
  const pushToken = process.env.PUSH_TOKEN || "";
  const sourceToken = process.env.SOURCE_REPO_TOKEN || "";
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
    sourceToken,
  });

  if (dryRun) {
    console.log(`Dry run complete. Composed docs at ${composedDir}`);
    return;
  }

  const { destination: targetDir, remoteUrl } = prepareTargetCheckout({
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

  pushBranch(targetDir, targetBranch, remoteUrl);
}

main();
