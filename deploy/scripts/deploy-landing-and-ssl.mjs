/**
 * Landing'i yeniden build eder ve panel.ogtasis.com icin SSL sertifikasini genisletir.
 * Kullanim: OTS_PROD_PASSWORD=... node deploy/scripts/deploy-landing-and-ssl.mjs
 */
import { Client } from "ssh2";
import { createReadStream, mkdirSync, existsSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

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
  console.log(`>> ${user}@${host} baglanti kuruluyor...`);
  const conn = await connect();

  console.log(">> Landing arsivi olusturuluyor (node_modules / dist haric)...");
  const archivePath = join(root, ".landing-deploy.tgz");
  if (existsSync(archivePath)) rmSync(archivePath);
  execSync(
    `tar -czf "${archivePath}" --exclude=node_modules --exclude=dist --exclude=._* -C "${root}" landing`,
    { stdio: "inherit", shell: true }
  );

  const remoteArchive = "/tmp/ots-landing-deploy.tgz";
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

  console.log(">> Landing klasoru aciliyor ve mac dotfiles temizleniyor...");
  await sshExec(
    conn,
    `set -e
cd ${target}
rm -rf ${target}/landing
tar -xzf ${remoteArchive}
find ${target}/landing -name "._*" -delete 2>/dev/null || true
ls ${target}/landing/src/components | head -20
`
  );

  console.log(">> Landing container yeniden build...");
  await sshExec(
    conn,
    `cd ${target}/deploy && docker compose -f docker-compose.prod.yml up -d --build landing`
  );

  console.log(">> Mevcut sertifika kontrolu...");
  const certBefore = await new Promise((resolve) => {
    conn.exec("docker exec ots_certbot certbot certificates 2>&1", (err, stream) => {
      let out = "";
      stream.on("data", (d) => (out += d.toString()));
      stream.on("close", () => resolve(out));
    });
  });
  process.stdout.write(certBefore);

  if (!certBefore.includes("panel.ogtasis.com")) {
    console.log("\n>> SSL sertifikasi panel.ogtasis.com icin genisletiliyor...");
    const domainArgs = domains.map((d) => `-d ${d}`).join(" ");
    await sshExec(
      conn,
      `cd ${target}/deploy && docker compose -f docker-compose.prod.yml run --rm --entrypoint certbot certbot \\
certonly --webroot -w /var/www/certbot ${domainArgs} \\
--email ${sslEmail} --agree-tos --no-eff-email --non-interactive --expand --force-renewal`
    );
  } else {
    console.log(">> Sertifikada panel.ogtasis.com zaten mevcut.");
  }

  console.log(">> Edge nginx yeniden baslatiliyor (yeni sertifikayi yuklemek icin)...");
  await sshExec(conn, `cd ${target}/deploy && docker compose -f docker-compose.prod.yml restart edge`);

  console.log(">> Servisler:");
  await sshExec(conn, `cd ${target}/deploy && docker compose -f docker-compose.prod.yml ps`);

  console.log("\n>> HTTPS dogrulama...");
  await sshExec(
    conn,
    `sleep 3
echo "--- ogtasis.com ---"
curl -sI https://ogtasis.com/ | head -3
echo "--- panel.ogtasis.com ---"
curl -sI https://panel.ogtasis.com/ | head -3
echo "--- panel /login ---"
curl -s https://panel.ogtasis.com/login | grep -o '<title>[^<]*</title>'
echo "--- sertifika kapsami ---"
echo | openssl s_client -servername panel.ogtasis.com -connect panel.ogtasis.com:443 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name" || true
`
  );

  conn.end();
  rmSync(archivePath);
  console.log("\nOK:");
  console.log("  https://ogtasis.com/        (landing — yeni Orb hero)");
  console.log("  https://panel.ogtasis.com/  (panel — gecerli SSL)");
}

main().catch((e) => {
  console.error("\nHATA:", e.message || e);
  process.exit(1);
});
