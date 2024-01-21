export const handleCommonErrors = (x: Response) => {
  if (x.status === 401) {
    throw new Error("AUTH_REQUIRED");
  }

  if (x.status === 404) {
    throw new Error("NOT_FOUND");
  }

  if (x.status >= 500) {
    throw new Error("INTERNAL_SERVER_ERROR");
  }

  throw new Error("UNKNOWN_ERROR");
};
