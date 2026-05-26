/**
 * Mevcut stack üzerinde SSL açar (tam redeploy yapmadan).
 * Kullanım: OTS_PROD_PASSWORD=... node deploy/scripts/enable-ssl-quick.mjs
 */
import { Client } from "ssh2";

const host = process.env.OTS_PROD_HOST || "188.132.234.29";
const user = process.env.OTS_PROD_USER || "root";
const password = process.env.OTS_PROD_PASSWORD;
const target = process.env.OTS_PROD_PATH || "/opt/ots";
const sslEmail = process.env.SSL_EMAIL || "billing@ogta.ai";
const domains = (process.env.SSL_DOMAINS || "ogtasis.com,www.ogtasis.com").split(",").map((d) => d.trim()).filter(Boolean);

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
    conn.on("ready", () => resolve(conn)).on("error", reject).connect({ host, port: 22, username: user, password, readyTimeout: 20000 });
  });
}

async function main() {
  const conn = await connect();
  const domainArgs = domains.map((d) => `-d ${d}`).join(" ");

  console.log(`>> Sertifika aliniyor: ${domains.join(", ")}`);
  await sshExec(
    conn,
    `cd ${target}/deploy && docker compose -f docker-compose.prod.yml run --rm --entrypoint certbot certbot \\
certonly --webroot -w /var/www/certbot ${domainArgs} \\
--email ${sslEmail} --agree-tos --no-eff-email --non-interactive --keep-until-expiring`
  );

  console.log(">> HTTPS nginx aktif...");
  await sshExec(
    conn,
    `set -e
cd ${target}/deploy
grep -q '^NGINX_CONFIG=' .env && sed -i 's/^NGINX_CONFIG=.*/NGINX_CONFIG=nginx.ssl.conf/' .env || echo 'NGINX_CONFIG=nginx.ssl.conf' >> .env
grep -q '^LANDING_URL=' .env && sed -i 's|^LANDING_URL=.*|LANDING_URL=https://ogtasis.com|' .env || echo 'LANDING_URL=https://ogtasis.com' >> .env
grep -q '^PANEL_URL=' .env && sed -i 's|^PANEL_URL=.*|PANEL_URL=https://panel.ogtasis.com|' .env || echo 'PANEL_URL=https://panel.ogtasis.com' >> .env
docker compose -f docker-compose.prod.yml up -d edge certbot
docker compose -f docker-compose.prod.yml up -d --build landing frontend
`
  );

  conn.end();
  console.log("\nOK: https://ogtasis.com/");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
