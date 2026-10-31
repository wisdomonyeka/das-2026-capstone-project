const configuredPort = process.env.PORT;
export const PORT = configuredPort === undefined || configuredPort === '' ? 3000 : Number(configuredPort);

if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  throw new RangeError('PORT must be an integer between 0 and 65535');
}
