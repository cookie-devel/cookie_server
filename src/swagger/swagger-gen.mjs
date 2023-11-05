import swaggerAutogen from "swagger-autogen";
const generateDoc = swaggerAutogen({ openapi: "3.0.0" });

const options = {
  info: {
    title: "Cookie Server API",
    description: "This is a Documentation of Cookie Server API",
  },
  servers: [
    {
      url: "http://localhost:3000",
    },
  ],
  schemes: ["http"],
  securityDefinitions: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      in: "header",
      bearerFormat: "JWT",
    },
  },
};
const outputFile = "./src/swagger/swagger-output.json";
const endpointsFiles = ["./src/routes/index.ts"];
generateDoc(outputFile, endpointsFiles, options);
