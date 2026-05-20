PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS collections (
    -- Contract address of the collection.
    contract_address TEXT PRIMARY KEY,

    -- Collection metadata.
    -- UNIQUE creates indexes automatically.
    name TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL UNIQUE,
    supply INTEGER
);

CREATE TABLE IF NOT EXISTS ethscriptions (
    -- References collections.contract_address.
    contract_address TEXT NOT NULL,

    -- Token ID is unique within a collection.
    token_id INTEGER NOT NULL,

    -- Globally unique ethscription identifiers.
    -- UNIQUE creates indexes automatically.
    ethscription_number INTEGER NOT NULL UNIQUE,
    ethscription_id TEXT NOT NULL UNIQUE,

    -- Also creates an index on (contract_address, token_id).
    PRIMARY KEY (contract_address, token_id),

    FOREIGN KEY (contract_address)
    REFERENCES collections(contract_address)
);

CREATE TABLE IF NOT EXISTS attributes (
    -- References ethscriptions(contract_address, token_id).
    contract_address TEXT NOT NULL,
    token_id INTEGER NOT NULL,

    -- Flattened searchable attributes.
    trait_type TEXT NOT NULL,
    trait_value TEXT NOT NULL,

    -- Denormalized for querying/ordering attribute queries globally.
    ethscription_number INTEGER NOT NULL,
    ethscription_id TEXT NOT NULL,

    FOREIGN KEY (contract_address, token_id)
    REFERENCES ethscriptions(contract_address, token_id)
);

-- Find attributes by contract + trait type.
CREATE INDEX IF NOT EXISTS idx_attributes_contract_trait_type
ON attributes(contract_address, trait_type);

-- Find attributes by contract + trait value.
CREATE INDEX IF NOT EXISTS idx_attributes_contract_trait_value
ON attributes(contract_address, trait_value);

-- Find attributes by contract + exact trait type/value pair.
CREATE INDEX IF NOT EXISTS idx_attributes_contract_trait_type_value
ON attributes(contract_address, trait_type, trait_value);

-- Join attributes back to ethscriptions efficiently.
CREATE INDEX IF NOT EXISTS idx_attributes_ethscription
ON attributes(contract_address, token_id);

-- Filter by exact trait pair and order by ethscription number.
CREATE INDEX IF NOT EXISTS idx_attributes_contract_trait_type_value_ethscription_number
ON attributes(contract_address, trait_type, trait_value, ethscription_number);

-- Global ordering by ethscription number from the attributes root.
CREATE INDEX IF NOT EXISTS idx_attributes_ethscription_number
ON attributes(ethscription_number);

-- Lookup by ethscription id from the attributes root.
CREATE INDEX IF NOT EXISTS idx_attributes_ethscription_id
ON attributes(ethscription_id);
