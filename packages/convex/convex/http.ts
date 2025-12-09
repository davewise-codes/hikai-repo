import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { githubAppCallback } from "./connectors/github";

const http = httpRouter();

auth.addHttpRoutes(http);
http.route({
	path: "/api/github/app/callback",
	method: "GET",
	handler: githubAppCallback,
});

export default http;
