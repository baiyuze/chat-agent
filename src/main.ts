import "dotenv/config";
import "reflect-metadata";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
// import { FileLogger } from "./logger/file-logger.service";

async function bootstrap() {
  // const logger = new FileLogger();
  const logger = new Logger("agents-internet");
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // logger,
  });
  const port = Number(process.env.PORT ?? 3000);

  app.setGlobalPrefix("api", {
    exclude: ["/"],
  });
  app.useStaticAssets(join(process.cwd(), "client/dist"));

  await app.listen(port);
  logger.log(`NestJS LangChain app is running at http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
