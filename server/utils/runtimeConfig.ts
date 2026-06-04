export const DEV_JWT_SECRET_FALLBACK = "miao-dev-secret-change-me";
export const DEV_ADMIN_TOKEN_FALLBACK = "miao_admin_8888";

const isMissingSecret = (value: string | undefined, fallback: string) => {
  return !value || value === fallback;
};

export const readSecret = (
  name: string,
  value: string | undefined,
  fallback: string,
  nodeEnv = process.env.NODE_ENV || "development"
) => {
  if (nodeEnv === "production" && isMissingSecret(value, fallback)) {
    throw new Error(`${name} must be configured with a non-default value in production`);
  }

  return value || fallback;
};
