/**
 * Panel frontend dist paketini canli container'a kopyalar.
 * Kullanim: OTS_PROD_PASSWORD=... node deploy/scripts/deploy-frontend.mjs
 */
import { Client } from "ssh2";
import { createReadStream, existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");
const webRoot = join(root, "frontend/apps/web");

const host = process.env.OTS_PROD_HOST || "188.132.234.29";
const user = process.env.OTS_PROD_USER || "root";
const password = process.env.OTS_PROD_PASSWORD;

if (!password) {
  console.error("OTS_PROD_PASSWORD gerekli");
  process.exit(1);
}

function sshExec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let errOut = "";
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`exit ${code}: ${errOut}`));
        else resolve();
      });
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => {
        errOut += d.toString();
        process.stderr.write(d);
      });
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
  console.log(">> Yerel frontend build...");
  execSync("npm run build", { cwd: webRoot, stdio: "inherit", shell: true });

  console.log(`>> ${user}@${host} baglanti kuruluyor...`);
  const conn = await connect();

  const archivePath = join(root, ".frontend-dist.tgz");
  if (existsSync(archivePath)) rmSync(archivePath);

  console.log(">> dist arsivi olusturuluyor...");
  execSync(`tar -czf "${archivePath}" -C "${webRoot}" dist public`, { stdio: "inherit", shell: true });

  const remoteArchive = "/tmp/ots-frontend-dist.tgz";
  console.log(">> Sunucuya yukleniyor...");
  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const read = createReadStream(archivePath);
      const write = sftp.createWriteStream(remoteArchive);
      write.on("close", resolve);
      write.on("error", reject);
      read.on("error", reject);
      read.pipe(write);
    });
  });

  console.log(">> Container static dosyalari guncelleniyor...");
  await sshExec(
    conn,
    `set -e
rm -rf /tmp/ots-frontend-dist
mkdir -p /tmp/ots-frontend-dist
tar -xzf ${remoteArchive} -C /tmp/ots-frontend-dist
docker exec ots_frontend sh -c 'rm -rf /usr/share/nginx/html/assets /usr/share/nginx/html/index.html'
docker cp /tmp/ots-frontend-dist/dist/. ots_frontend:/usr/share/nginx/html/
docker cp /tmp/ots-frontend-dist/public/. ots_frontend:/usr/share/nginx/html/
docker exec ots_frontend nginx -s reload
`
  );

  conn.end();
  console.log("\nOK: https://panel.ogtasis.com/login");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
