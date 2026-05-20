export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type EthscriptionId = string;

export type EthscriptionPrimitive = string | number | boolean | null;

export type EthscriptionRecord = {
  media_type: string;
  image_removed_by_request_of_rights_holder?: boolean;
  transaction_hash: string;
  ethscription_number: string;
  content_uri: string;
  content_type: string;
  [key: string]:
    | EthscriptionPrimitive
    | EthscriptionPrimitive[]
    | EthscriptionRecord
    | undefined;
};

export type EthscriptionMetadataResponse = {
  result?: EthscriptionRecord;
  data?: EthscriptionRecord;
  error?: unknown;
  [key: string]: unknown;
};

export type EthscriptionContentResponse = {
  id: EthscriptionId;
  headers: Headers;
  contentBody: ArrayBuffer;
  contentType: string | null;
  contentLength: string | null;
};

export class EthscriptionFetchError extends Error {
  status: number;
  url: string;

  constructor(message: string, status: number, url: string, cause?: unknown) {
    super(message, cause ? { cause } : undefined);
    this.name = "EthscriptionFetchError";
    this.status = status;
    this.url = url;
  }
}
