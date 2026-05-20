import { Client } from "ssh2";
const password = process.env.OTS_PROD_PASSWORD;
const conn = await new Promise((resolve, reject) => {
  const c = new Client();
  c.on("ready", () => resolve(c)).on("error", reject).connect({ host: "188.132.234.29", username: "root", password });
});
function exec(cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => (out += d));
      stream.stderr.on("data", (d) => (out += d));
      stream.on("close", () => resolve(out));
    });
  });
}
console.log(await exec("docker exec ots_postgres psql -U ots -d ots -c \"SELECT id,name FROM tenants WHERE id='00000000-0000-0000-0000-000000020001'\""));
console.log(await exec("docker exec ots_postgres psql -U ots -d ots -c \"SELECT count(*) FROM students WHERE tenant_id='00000000-0000-0000-0000-000000020001'\""));
console.log(await exec("docker exec ots_postgres psql -U ots -d ots -c \"SELECT id,status FROM schedules WHERE tenant_id='00000000-0000-0000-0000-000000020001'\""));
console.log(await exec("docker logs ots_backend 2>&1 | tail -5"));
conn.end();
