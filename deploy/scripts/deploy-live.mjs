import { Client } from "ssh2";
import { createReadStream, readFileSync } from "fs";
import { join, relative } from "path";
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
  console.log(`>> Baglanti: ${user}@${host}`);
  const conn = await connect();

  console.log(">> Git arsiv olusturuluyor...");
  const archivePath = join(root, ".deploy-bundle.tar.gz");
  execSync(
    `tar -czf "${archivePath}" --exclude=node_modules --exclude=.git --exclude=frontend/apps/web/dist --exclude=landing/node_modules --exclude=landing/dist --exclude=backend/tmp --exclude=.deploy-bundle.tar.gz -C "${root}" .`,
    { stdio: "inherit", shell: true }
  );

  const remoteArchive = "/tmp/ots-deploy-bundle.tar.gz";
  console.log(">> Arsiv yukleniyor...");
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
NGINX_CONFIG=${process.env.NGINX_CONFIG || "nginx.ssl.conf"}
LANDING_URL=${process.env.LANDING_URL || "https://ogtasis.com"}
PANEL_URL=${process.env.PANEL_URL || "https://panel.ogtasis.com"}
CORS_ALLOWED_ORIGINS=${process.env.CORS_ALLOWED_ORIGINS || "https://panel.ogtasis.com,http://panel.ogtasis.com,https://ogtasis.com,http://ogtasis.com,http://188.132.234.29:3110,http://188.132.234.29"}
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

  console.log(">> Sunucuda aciliyor ve docker build...");
  await sshExec(
    conn,
    `set -e
mkdir -p ${target}
cd ${target}
tar -xzf ${remoteArchive}
find deploy -name '*.sh' -exec sed -i 's/\\r$//' {} +
cd deploy
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
`
  );

  console.log(">> Priente seed uygulaniyor...");
  const sql = readFileSync(join(root, "backend/migrations/000006_priente_test_school.sql"), "utf8");
  const remoteSql = "/tmp/000006_priente_test_school.sql";
  await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const write = sftp.createWriteStream(remoteSql);
      write.on("close", resolve);
      write.on("error", reject);
      write.end(sql);
    });
  });

  await sshExec(
    conn,
    `docker exec -i ots_postgres psql -v ON_ERROR_STOP=1 -U ots -d ots < ${remoteSql}
docker exec ots_postgres psql -U ots -d ots -c "INSERT INTO schema_migrations(version) VALUES ('000006_priente_test_school.sql') ON CONFLICT DO NOTHING;"
docker exec ots_postgres psql -U ots -d ots -c "SELECT name, (SELECT count(*) FROM students s WHERE s.tenant_id=t.id) students FROM tenants t WHERE id='00000000-0000-0000-0000-000000020001';"
`
  );

  conn.end();
  console.log("\nOK:");
  console.log("  Landing:  https://ogtasis.com/");
  console.log("  Panel:    https://panel.ogtasis.com/");
  console.log("  Yedek IP: http://" + host + ":3110/");
  console.log("  SSL yoksa: node deploy/scripts/setup-ssl.mjs");
  console.log("Giris: mudur@priente.k12.tr / OtsMudur!2026");
  console.log("\nDNS: ogtasis.com ve panel.ogtasis.com A kayitlari -> " + host);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
