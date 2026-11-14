const { spawn } = require("child_process");

function run(name, command, args) {
  const child = spawn(command, args, { stdio: "inherit", shell: true });
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${name} exited with code ${code}`);
      process.exit(code);
    }
  });
  return child;
}

console.log("Starting ResumeLens AI — server on :3001, client on :5173");
run("server", "node", ["server/index.js"]);
run("client", "npx", ["vite"]);
