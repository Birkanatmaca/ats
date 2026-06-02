/**
 * Mobil web (mobile.ogtasis.com) deploy + SSL genisletme.
 * Kullanim: OTS_PROD_PASSWORD=... node deploy/scripts/deploy-mobile-and-ssl.mjs
 */
import { Client } from "ssh2";
import { execSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "../..");

const host = process.env.OTS_PROD_HOST || "188.132.234.29";
const user = process.env.OTS_PROD_USER || "root";
const password = process.env.OTS_PROD_PASSWORD;
const target = process.env.OTS_PROD_PATH || "/opt/ots";
const sslEmail = process.env.SSL_EMAIL || "billing@ogta.ai";
const domains = ["ogtasis.com", "www.ogtasis.com", "panel.ogtasis.com", "mobile.ogtasis.com"];

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
  console.log(">> Kod senkronize ediliyor...");
  execSync(`bash "${join(__dirname, "push-prod.sh")}"`, { stdio: "inherit", cwd: root });

  console.log(`\n>> ${user}@${host} baglanti kuruluyor...`);
  const conn = await connect();

  console.log(">> CORS guncelleniyor...");
  await sshExec(
    conn,
    `set -e
cd ${target}/deploy
if grep -q '^CORS_ALLOWED_ORIGINS=' .env; then
  sed -i 's|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://panel.ogtasis.com,http://panel.ogtasis.com,https://mobile.ogtasis.com,http://mobile.ogtasis.com,https://ogtasis.com,http://ogtasis.com,http://188.132.234.29:3110,http://188.132.234.29,http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006|' .env
else
  echo 'CORS_ALLOWED_ORIGINS=https://panel.ogtasis.com,http://panel.ogtasis.com,https://mobile.ogtasis.com,http://mobile.ogtasis.com,https://ogtasis.com,http://ogtasis.com,http://188.132.234.29:3110,http://188.132.234.29,http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006' >> .env
fi
grep -q '^MOBILE_URL=' .env && sed -i 's|^MOBILE_URL=.*|MOBILE_URL=https://mobile.ogtasis.com|' .env || echo 'MOBILE_URL=https://mobile.ogtasis.com' >> .env
grep -q '^NGINX_CONFIG=' .env && sed -i 's|^NGINX_CONFIG=.*|NGINX_CONFIG=nginx.ssl.conf|' .env || echo 'NGINX_CONFIG=nginx.ssl.conf' >> .env
`
  );

  console.log(">> Mobil web + backend yeniden build...");
  await sshExec(
    conn,
    `cd ${target}/deploy && docker compose -f docker-compose.prod.yml up -d --build mobile_web backend edge`
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

  if (!certBefore.includes("mobile.ogtasis.com")) {
    console.log("\n>> SSL sertifikasi mobile.ogtasis.com icin genisletiliyor...");
    const domainArgs = domains.map((d) => `-d ${d}`).join(" ");
    await sshExec(
      conn,
      `cd ${target}/deploy && docker compose -f docker-compose.prod.yml run --rm --entrypoint certbot certbot \\
certonly --webroot -w /var/www/certbot ${domainArgs} \\
--email ${sslEmail} --agree-tos --no-eff-email --non-interactive --expand --force-renewal`
    );
  } else {
    console.log(">> Sertifikada mobile.ogtasis.com zaten mevcut.");
  }

  console.log(">> Edge nginx yeniden baslatiliyor...");
  await sshExec(conn, `cd ${target}/deploy && docker compose -f docker-compose.prod.yml restart edge`);

  console.log("\n>> HTTPS dogrulama...");
  await sshExec(
    conn,
    `sleep 3
echo "--- panel.ogtasis.com (desktop) ---"
curl -sI https://panel.ogtasis.com/login | head -5
echo "--- panel.ogtasis.com (mobile UA) ---"
curl -sI -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" https://panel.ogtasis.com/login | head -5
echo "--- mobile.ogtasis.com ---"
curl -sI https://mobile.ogtasis.com/login | head -5
echo | openssl s_client -servername mobile.ogtasis.com -connect mobile.ogtasis.com:443 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name" || true
`
  );

  conn.end();
  console.log("\nOK:");
  console.log("  https://panel.ogtasis.com/     (masaustu panel)");
  console.log("  https://mobile.ogtasis.com/    (mobil web arayuzu)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
