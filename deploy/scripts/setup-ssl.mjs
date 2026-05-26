import { Client } from "ssh2";
import { createReadStream, readFileSync } from "fs";
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
const sslEmail = process.env.SSL_EMAIL || "billing@ogta.ai";
const domains = ["ogtasis.com", "www.ogtasis.com", "panel.ogtasis.com"];

if (!password) {
  console.error("OTS_PROD_PASSWORD gerekli");
  process.exit(1);
}

function sshExec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      let errOut = "";
      stream.on("close", (code) => {
        if (code !== 0) reject(new Error(`exit ${code}: ${errOut || out}`));
        else resolve(out);
      });
      stream.on("data", (d) => {
        out += d.toString();
        process.stdout.write(d);
      });
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
  console.log(`>> SSL kurulumu: ${user}@${host}`);
  const conn = await connect();

  console.log(">> Deploy arsivi hazirlaniyor...");
  const archivePath = join(root, ".deploy-bundle.tar.gz");
  execSync(
    `tar -czf "${archivePath}" --exclude=node_modules --exclude=.git --exclude=frontend/apps/web/dist --exclude=landing/node_modules --exclude=landing/dist --exclude=backend/tmp --exclude=.deploy-bundle.tar.gz -C "${root}" .`,
    { stdio: "inherit", shell: true }
  );

  const remoteArchive = "/tmp/ots-deploy-bundle.tar.gz";
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

  const envFile = `OTS_POSTGRES_PASSWORD=${password}
NGINX_CONFIG=nginx.http.conf
LANDING_URL=https://ogtasis.com
PANEL_URL=https://panel.ogtasis.com
CORS_ALLOWED_ORIGINS=https://panel.ogtasis.com,http://panel.ogtasis.com,https://ogtasis.com,http://ogtasis.com,http://188.132.234.29:3110,http://188.132.234.29
SSL_EMAIL=${sslEmail}
`;
  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const write = sftp.createWriteStream(`${target}/deploy/.env`);
      write.on("close", resolve);
      write.on("error", reject);
      write.end(envFile);
    });
  });

  console.log(">> HTTP nginx ile stack baslatiliyor (ACME hazirligi)...");
  await sshExec(
    conn,
    `set -e
mkdir -p ${target}
cd ${target}
tar -xzf ${remoteArchive}
find deploy -name '*.sh' -exec sed -i 's/\\r$//' {} +
cd deploy
docker compose -f docker-compose.prod.yml up -d --build edge landing frontend backend certbot
`
  );

  const domainArgs = domains.map((d) => `-d ${d}`).join(" ");
  console.log(">> Let's Encrypt sertifikasi aliniyor...");
  await sshExec(
    conn,
    `cd ${target}/deploy && docker compose -f docker-compose.prod.yml run --rm --entrypoint certbot certbot \\
certonly --webroot -w /var/www/certbot ${domainArgs} \\
--email ${sslEmail} --agree-tos --no-eff-email --non-interactive --keep-until-expiring`
  );

  console.log(">> HTTPS nginx aktif ediliyor...");
  await sshExec(
    conn,
    `set -e
cd ${target}/deploy
grep -q '^NGINX_CONFIG=' .env && sed -i 's/^NGINX_CONFIG=.*/NGINX_CONFIG=nginx.ssl.conf/' .env || echo 'NGINX_CONFIG=nginx.ssl.conf' >> .env
docker compose -f docker-compose.prod.yml up -d edge certbot
docker compose -f docker-compose.prod.yml ps
`
  );

  console.log(">> HTTPS URL'ler ile landing + panel yeniden build...");
  await sshExec(
    conn,
    `cd ${target}/deploy && docker compose -f docker-compose.prod.yml up -d --build landing frontend backend`
  );

  conn.end();
  console.log("\nOK:");
  console.log("  https://ogtasis.com/");
  console.log("  https://panel.ogtasis.com/");
  console.log(`  Sertifika e-posta: ${sslEmail}`);
  console.log("  Otomatik yenileme: ots_certbot container (12 saatte bir kontrol)");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
