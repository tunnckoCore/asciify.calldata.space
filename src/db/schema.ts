import { relations } from "drizzle-orm";
import {
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";

// Source of truth: scripts/tables.sql

export const collections = sqliteTable("collections", {
  contractAddress: text("contract_address").primaryKey(),
  name: text("name").notNull().unique(),
  symbol: text("symbol").notNull().unique(),
  supply: integer("supply"),
});

export const ethscriptions = sqliteTable(
  "ethscriptions",
  {
    contractAddress: text("contract_address")
      .notNull()
      .references(() => collections.contractAddress),
    tokenId: integer("token_id").notNull(),
    ethscriptionNumber: integer("ethscription_number").notNull().unique(),
    ethscriptionId: text("ethscription_id").notNull().unique(),
  },
  (table) => [primaryKey({ columns: [table.contractAddress, table.tokenId] })],
);

export const attributes = sqliteTable(
  "attributes",
  {
    contractAddress: text("contract_address").notNull(),
    tokenId: integer("token_id").notNull(),
    traitType: text("trait_type").notNull(),
    traitValue: text("trait_value").notNull(),
    ethscriptionNumber: integer("ethscription_number").notNull(),
    ethscriptionId: text("ethscription_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.contractAddress, table.tokenId],
      foreignColumns: [ethscriptions.contractAddress, ethscriptions.tokenId],
    }),
    index("idx_attributes_contract_trait_type").on(
      table.contractAddress,
      table.traitType,
    ),
    index("idx_attributes_contract_trait_value").on(
      table.contractAddress,
      table.traitValue,
    ),
    index("idx_attributes_contract_trait_type_value").on(
      table.contractAddress,
      table.traitType,
      table.traitValue,
    ),
    index("idx_attributes_ethscription").on(
      table.contractAddress,
      table.tokenId,
    ),
    index("idx_attributes_contract_trait_type_value_ethscription_number").on(
      table.contractAddress,
      table.traitType,
      table.traitValue,
      table.ethscriptionNumber,
    ),
    index("idx_attributes_ethscription_number").on(table.ethscriptionNumber),
    index("idx_attributes_ethscription_id").on(table.ethscriptionId),
  ],
);

export const collectionsRelations = relations(collections, ({ many }) => ({
  ethscriptions: many(ethscriptions),
}));

export const ethscriptionsRelations = relations(
  ethscriptions,
  ({ one, many }) => ({
    collection: one(collections, {
      fields: [ethscriptions.contractAddress],
      references: [collections.contractAddress],
    }),
    attributes: many(attributes),
  }),
);

export const attributesRelations = relations(attributes, ({ one }) => ({
  ethscription: one(ethscriptions, {
    fields: [attributes.contractAddress, attributes.tokenId],
    references: [ethscriptions.contractAddress, ethscriptions.tokenId],
  }),
}));

export const selectCollectionSchema = createSelectSchema(collections);
export const insertCollectionSchema = createInsertSchema(collections);
export const updateCollectionSchema = createUpdateSchema(collections);

export const selectEthscriptionSchema = createSelectSchema(ethscriptions);
export const insertEthscriptionSchema = createInsertSchema(ethscriptions);
export const updateEthscriptionSchema = createUpdateSchema(ethscriptions);

export const selectAttributeSchema = createSelectSchema(attributes);
export const insertAttributeSchema = createInsertSchema(attributes);
export const updateAttributeSchema = createUpdateSchema(attributes);
