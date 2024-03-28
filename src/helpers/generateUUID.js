export default () => {
  const uuid = crypto.randomUUID();
  return uuid.substring(0, uuid.indexOf('-'));
};
