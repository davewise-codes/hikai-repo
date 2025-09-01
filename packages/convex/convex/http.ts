import { httpRouter } from "convex/server";
import { auth } from "./auth/auth.config";

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;