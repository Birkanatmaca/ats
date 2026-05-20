import { Client } from "ssh2";

const host = process.env.OTS_PROD_HOST || "188.132.234.29";
const password = process.env.OTS_PROD_PASSWORD;

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => (code ? reject(new Error(`exit ${code}`)) : resolve()));
    });
  });
}

const conn = await new Promise((resolve, reject) => {
  const c = new Client();
  c.on("ready", () => resolve(c)).on("error", reject).connect({ host, username: "root", password });
});

await exec(conn, `cd /opt/ots/deploy && sed -i 's/\\r$//' migrate.sh`);
await exec(
  conn,
  `cd /opt/ots/deploy && docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker exec ots_postgres psql -U ots -d ots -c "INSERT INTO schema_migrations(version) VALUES ('000006_priente_test_school.sql') ON CONFLICT DO NOTHING;"
docker exec ots_postgres psql -U ots -d ots -c "SELECT t.name, (SELECT count(*) FROM students s WHERE s.tenant_id=t.id) AS students FROM tenants t WHERE t.id='00000000-0000-0000-0000-000000020001';"
curl -sf http://127.0.0.1:3110/ >/dev/null && echo FRONTEND_OK || echo FRONTEND_FAIL
docker exec ots_backend wget -qO- http://127.0.0.1:8080/healthz && echo BACKEND_OK`
);

conn.end();
console.log("\nCanli: http://" + host + ":3110/");
console.log("mudur@priente.k12.tr / OtsMudur!2026");
