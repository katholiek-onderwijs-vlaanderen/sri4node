import * as undici from "undici";
import { THttpMethod } from "../js/typeDefinitions";
import utils from "./utils";
import FormData from "form-data";

export type THttpHeaders = {
  [key: string]: string | string[] | undefined;
};

export type THttpRequest = {
  path: string;
  body?: any; //TODO: restrict
  streaming?: boolean;
  auth?: string;
  headers?: THttpHeaders;
};

export type THttpResponse = {
  status: number;
  headers: THttpHeaders;
  trailers: THttpHeaders;
  body: any; //TODO: restrict
};

export type THttpClient = {
  get: (req: THttpRequest) => Promise<THttpResponse>;
  put: (req: THttpRequest) => Promise<THttpResponse>;
  delete: (req: THttpRequest) => Promise<THttpResponse>;
  post: (req: THttpRequest) => Promise<THttpResponse>;
  patch: (req: THttpRequest) => Promise<THttpResponse>;
};

const handleHttpRequest = async (
  method: THttpMethod,
  req: THttpRequest,
  undiciClient: undici.Client,
): Promise<THttpResponse> => {
  const reqHeaders = {
    "content-type": "application/json; charset=utf-8",
    ...(req.auth
      ? { authorization: utils.makeBasicAuthHeader(`${req.auth}@email.be`, "pwd") }
      : {}),
    ...req.headers,
  };

  try {
    const { statusCode, headers, body, trailers } = await undiciClient.request({
      path: req.path,
      method,
      headers: reqHeaders,
      body:
        typeof req.body === "string" || req.body instanceof FormData
          ? req.body
          : JSON.stringify(req.body),
    });
    return {
      status: statusCode,
      headers,
      trailers,
      body: req.streaming
        ? body
        : headers["content-type"] === "application/json; charset=utf-8"
          ? await body.json()
          : await body.text(),
    };
  } catch (err) {
    console.log("Http request FAILED:");
    console.log(err);
    throw new Error("htpclient.failure");
  }
};

export default {
  httpClientFactory: (base: string): THttpClient => {
    const undiciClient = new undici.Client(base);
    return {
      get: (req: THttpRequest): Promise<THttpResponse> =>
        handleHttpRequest("GET", req, undiciClient),
      put: (req: THttpRequest): Promise<THttpResponse> =>
        handleHttpRequest("PUT", req, undiciClient),
      delete: (req: THttpRequest): Promise<THttpResponse> =>
        handleHttpRequest("DELETE", req, undiciClient),
      post: (req: THttpRequest): Promise<THttpResponse> =>
        handleHttpRequest("POST", req, undiciClient),
      patch: (req: THttpRequest): Promise<THttpResponse> =>
        handleHttpRequest("PATCH", req, undiciClient),
    };
  },
};
