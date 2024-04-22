import * as undici from "undici";
import { THttpMethod } from "../js/typeDefinitions";
import * as utils from "./utils";
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
  /**
   * This asynchronous method uses unidicClient.destroy internally to destroy the client,
   * and then creates a new client.
   * This is useful when you want to test if eveything is stable even when the connection
   * gets broken.
   *
   * Here is the explanation of unidiciClient.destroy:
   * > Destroy the client abruptly with the given err. All the pending and running requests will be
   *   asynchronously aborted and error. Waits until socket is closed before invoking the callback
   *   (or returning a promise if no callback is provided). Since this operation is asynchronously
   *   dispatched there might still be some progress on dispatched requests.
   */
  destroy: () => Promise<void>;
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
    let undiciClient = new undici.Client(base);
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
      destroy: async (): Promise<void> => {
        await undiciClient.destroy();
        undiciClient = new undici.Client(base);
      },
    };
  },
};
