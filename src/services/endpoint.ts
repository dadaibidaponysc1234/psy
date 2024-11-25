import axiosClient from "./axios-client";
import { AxiosResponse } from "axios";

export const apiCall = async (
  body: any,
  path: string,
  method: string,
  extraHeaders?: any,
  params?: any,
  showLoader: boolean | string = false,
  showMessage: boolean = true
) => {
  try {
    const client = await axiosClient();
    let res: AxiosResponse | null = null;

    if (extraHeaders) {
      client.defaults.headers.common = {
        ...client.defaults.headers.common,
        ...extraHeaders,
      };
    }

    switch (method) {
      case "post":
        res = await client.post(path, body, { params });
        break;
      case "get":
        res = await client.get(path, { params });
        break;
      case "put":
        res = await client.put(path, body, { params });
        break;
      case "delete":
        res = await client.delete(path, { params });
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    // if (!res) {
    //   throw new Error("Empty response from server")
    // }

    const responseData: any = res?.data;
    if (responseData?.status === "success" || responseData?.success === true) {
      if (
        method !== "get" &&
        typeof window !== "undefined" &&
        responseData?.message &&
        !!showMessage
      ) {
        // message.success(responseData?.message);
      }
      return responseData;
    } else {
      const errorMessage = responseData?.message || "Something went wrong!";
      if (
        method !== "get" &&
        typeof window !== "undefined" &&
        errorMessage &&
        !!showMessage
      ) {
        // message.error(errorMessage, 6);
      }
      return responseData;
    }
  } catch (error: any) {
    const errorMessage = error?.message
      ? error?.message
      : "Something went wrong!";
    // const errorMessage = "Something went wrong!"
    if (typeof window !== "undefined" && showMessage) {
      //   message.error(errorMessage, 6);
      //   hide && hide();
    }
    return error;
  } finally {
    // if (hide && typeof window !== "undefined") {
    //   hide();
    //   message.destroy(messageId);
    // }
  }
};
