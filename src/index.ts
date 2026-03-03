import AppServer from "./app/application-server";

const main = async () => {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5001;
    
    const server = new AppServer({
        port,
        routeDir: "src/modules",
        routeContext: "sps"
    });

    await server.bootstrap();
};

main();
