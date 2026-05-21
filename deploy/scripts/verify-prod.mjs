import { Client } from "ssh2";

const password = process.env.OTS_PROD_PASSWORD;
const conn = await new Promise((resolve, reject) => {
  const c = new Client();
  c.on("ready", () => resolve(c)).on("error", reject).connect({
    host: "188.132.234.29",
    username: "root",
    password
  });
});

function exec(cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = "";
      stream.on("data", (d) => (out += d));
      stream.stderr.on("data", (d) => (out += d));
      stream.on("close", () => resolve(out.trim()));
    });
  });
}

const login = await exec(`curl -s -X POST http://127.0.0.1:3110/api/v1/auth/login -H "Content-Type: application/json" -d "{\\"email\\":\\"mudur@priente.k12.tr\\",\\"password\\":\\"OtsMudur!2026\\"}"`);
const token = JSON.parse(login).data.accessToken;

const notificationsStatus = await exec(`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3110/api/v1/notifications -H "Authorization: Bearer ${token}"`);
console.log("notifications HTTP:", notificationsStatus);

const generate = await exec(`curl -s -X POST http://127.0.0.1:3110/api/v1/schedules/generate -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d "{}"`);
const parsed = JSON.parse(generate);
console.log("schedule id:", parsed.data?.schedule?.id || "(empty)");
console.log("lessons:", parsed.data?.schedule?.lessons?.length ?? 0);
console.log("recommendation:", parsed.data?.recommendation || "-");

conn.end();
