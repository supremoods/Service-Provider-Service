import AppServer from "./app/application-server";

const envPort = Number.parseInt(process.env.PORT ?? "", 10);
const port = Number.isFinite(envPort) ? envPort : 5001;

const server = new AppServer({
    port,
    routeDir: "src/modules",
    routeContext: "sps",
});

await server.bootstrap();
