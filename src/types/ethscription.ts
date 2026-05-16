export type EthscriptionId = string;

export type EthscriptionPrimitive = string | number | boolean | null;

export type EthscriptionRecord = {
  media_type?: string;
  image_removed_by_request_of_rights_holder?: boolean;
  ethscription_number?: string | number;
  content_uri?: string;
  [key: string]: EthscriptionPrimitive | EthscriptionPrimitive[] | EthscriptionRecord | undefined;
};

export type EthscriptionMetadataResponse = {
  result?: EthscriptionRecord;
  data?: EthscriptionRecord;
  error?: unknown;
  [key: string]: unknown;
};

export type EthscriptionContentResponse = {
  id: EthscriptionId;
  body: ArrayBuffer;
  contentType: string | null;
};

export class EthscriptionFetchError extends Error {
  status: number;
  url: string;

  constructor(message: string, status: number, url: string, cause?: unknown) {
    super(message, cause ? { cause } : undefined);
    this.name = 'EthscriptionFetchError';
    this.status = status;
    this.url = url;
  }
}
