PRAGMA foreign_keys = ON;

CREATE TABLE collections (
    -- Contract address of the collection.
    collection_id TEXT PRIMARY KEY,

    -- Collection metadata.
    -- UNIQUE creates indexes automatically.
    name TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL UNIQUE,
    supply INTEGER
);

CREATE TABLE items (
    -- References collections.collection_id.
    collection_id TEXT NOT NULL,

    -- Token ID is unique within a collection.
    token_id TEXT NOT NULL,

    -- Globally unique item identifiers.
    -- UNIQUE creates indexes automatically.
    ethscription_number INTEGER NOT NULL UNIQUE,
    ethscription_id TEXT NOT NULL UNIQUE,

    -- Original raw attributes JSON for display/export.
    attributes TEXT CHECK (attributes IS NULL OR json_valid(attributes)),

    -- Also creates an index on (collection_id, token_id).
    PRIMARY KEY (collection_id, token_id),

    FOREIGN KEY (collection_id)
    REFERENCES collections(collection_id)
);

CREATE TABLE item_attributes (
    -- References items(collection_id, token_id).
    collection_id TEXT NOT NULL,
    token_id TEXT NOT NULL,

    -- Flattened searchable attributes.
    trait_type TEXT NOT NULL,
    trait_value TEXT NOT NULL,

    FOREIGN KEY (collection_id, token_id)
    REFERENCES items(collection_id, token_id)
);

-- Find attributes by collection + trait type.
CREATE INDEX idx_item_attributes_collection_trait_type
ON item_attributes(collection_id, trait_type);

-- Find attributes by collection + trait value.
CREATE INDEX idx_item_attributes_collection_trait_value
ON item_attributes(collection_id, trait_value);

-- Find attributes by collection + exact trait type/value pair.
CREATE INDEX idx_item_attributes_collection_trait_type_value
ON item_attributes(collection_id, trait_type, trait_value);

-- Join item_attributes back to items efficiently.
CREATE INDEX idx_item_attributes_item
ON item_attributes(collection_id, token_id);
