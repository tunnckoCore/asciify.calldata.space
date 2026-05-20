import type { APIRoute } from "astro";
import { buildSchema } from "drizzle-graphql";
import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { createYoga } from "graphql-yoga";
import { db } from "../db";

const { entities } = buildSchema(db);

const queryFields = Object.fromEntries(
  Object.entries(entities.queries).filter(([name]) => !name.endsWith("Single")),
);

const mutationFields = Object.fromEntries(
  Object.entries(entities.mutations).filter(
    ([name]) => !name.endsWith("Single"),
  ),
);

const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "Query",
    fields: queryFields,
  }),
  mutation: new GraphQLObjectType({
    name: "Mutation",
    fields: mutationFields,
  }),
  types: [...Object.values(entities.types), ...Object.values(entities.inputs)],
});

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/graphql",
});

async function handle(request: Request): Promise<Response> {
  const response = await yoga.fetch(request);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export const GET: APIRoute = async ({ request }) => handle(request);
export const POST: APIRoute = async ({ request }) => handle(request);
export const OPTIONS: APIRoute = async ({ request }) => handle(request);
