import { Client } from "ssh2";

const host = process.env.OTS_PROD_HOST || "188.132.234.29";
const password = process.env.OTS_PROD_PASSWORD;

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => {
        out += d.toString();
        process.stdout.write(d);
      });
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => (code ? reject(new Error(`exit ${code}`)) : resolve(out)));
    });
  });
}

const conn = await new Promise((resolve, reject) => {
  const c = new Client();
  c.on("ready", () => resolve(c)).on("error", reject).connect({ host, username: "root", password });
});

const newPwd = password;
await exec(
  conn,
  `docker exec ots_postgres psql -U ots -d ots -c "ALTER USER ots WITH PASSWORD '${newPwd}';" 2>&1 || docker exec -e PGPASSWORD=ots ots_postgres psql -U ots -d ots -c "SELECT 1" 2>&1`
);

await exec(conn, `cd /opt/ots/deploy && sed -i 's/\\r$//' migrate.sh seed-priente-on-server.sh 2>/dev/null; sed -i 's/\\r$//' /opt/ots/deploy/migrate.sh`);
await exec(conn, `cd /opt/ots/deploy && docker compose -f docker-compose.prod.yml run --rm migrate sh /migrate.sh 2>&1 | tail -40`);

conn.end();
