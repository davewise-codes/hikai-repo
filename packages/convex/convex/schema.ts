import { defineSchema } from "convex/server";
import { authTables } from "@convex-dev/auth/server";

// Schema principal que incluye las tablas de auth
const schema = defineSchema({
  ...authTables,
  
  // Aquí se añadirán más tablas según crezcan los dominios
  // organizaciones, proyectos, sources, etc.
});

export default schema;