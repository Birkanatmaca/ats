/**
 * Canlı sunucudaki (/opt/ots) kodu yerel projeye indirir.
 * Kullanım: OTS_PROD_PASSWORD=... node deploy/scripts/pull-prod.mjs
 */
import { Client } from "ssh2";
import { createWriteStream, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");

const host = process.env.OTS_PROD_HOST || "188.132.234.29";
const user = process.env.OTS_PROD_USER || "root";
const password = process.env.OTS_PROD_PASSWORD;
const target = process.env.OTS_PROD_PATH || "/opt/ots";

if (!password) {
  console.error("OTS_PROD_PASSWORD gerekli");
  process.exit(1);
}

function sshExec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`exit ${code}: ${out}`));
        else resolve(out);
      });
      stream.on("data", (d) => {
        out += d.toString();
        process.stdout.write(d);
      });
      stream.stderr.on("data", (d) => process.stderr.write(d));
    });
  });
}

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => resolve(conn))
      .on("error", reject)
      .connect({ host, port: 22, username: user, password, readyTimeout: 20000 });
  });
}

async function main() {
  console.log(`>> Baglanti: ${user}@${host}`);
  const conn = await connect();
  const remoteArchive = "/tmp/ots-pull-bundle.tar.gz";
  const localArchive = join(root, ".pull-prod-bundle.tar.gz");

  console.log(`>> Sunucuda arsiv: ${target}`);
  await sshExec(
    conn,
    `set -e
cd ${target}
tar -czf ${remoteArchive} \\
  --exclude=node_modules \\
  --exclude=frontend/apps/web/dist \\
  --exclude=backend/tmp \\
  --exclude=.pull-prod-bundle.tar.gz \\
  --exclude=.deploy-bundle.tar.gz \\
  .`
  );

  console.log(">> Indiriliyor...");
  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const read = sftp.createReadStream(remoteArchive);
      const write = createWriteStream(localArchive);
      write.on("close", resolve);
      write.on("error", reject);
      read.on("error", reject);
      read.pipe(write);
    });
  });

  conn.end();

  const extractDir = join(root, ".pull-prod-extract");
  if (existsSync(extractDir)) {
    rmSync(extractDir, { recursive: true, force: true });
  }
  mkdirSync(extractDir, { recursive: true });

  console.log(">> Yerelde aciliyor...");
  execSync(`tar -xzf "${localArchive}" -C "${extractDir}"`, { stdio: "inherit", shell: true });

  console.log(">> Proje klasorune kopyalaniyor (deploy/.env haric)...");
  const excludes = [
    "deploy/.env",
    ".git",
    "node_modules",
    ".pull-prod-extract",
    ".pull-prod-bundle.tar.gz",
    ".deploy-bundle.tar.gz"
  ];
  const robocopyArgs = [
    `"${extractDir}"`,
    `"${root}"`,
    "/E",
    "/XO",
    ...excludes.map((e) => `/XD "${join(extractDir, e)}"`.replace(extractDir, "").replace(/^\\/, "") || "")
  ];
  // Windows: robocopy source dest /E /XD dirs
  const xd = ["node_modules", ".git", ".pull-prod-extract"].map((d) => join(extractDir, d));
  execSync(
    `robocopy "${extractDir}" "${root}" /E /XO /XD node_modules .git .pull-prod-extract /XF .pull-prod-bundle.tar.gz .deploy-bundle.tar.gz deploy\\.env`,
    { stdio: "inherit", shell: true }
  );

  rmSync(extractDir, { recursive: true, force: true });
  console.log("\nOK: Canli kod yerel projeye alindi. git status ile kontrol edin.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
