export const parseTokenDurationToSeconds = (
  value: string,
  configName: string,
): number => {
  const normalizedValue = value.trim();
  const asNumber = Number(normalizedValue);

  if (Number.isInteger(asNumber) && asNumber > 0) {
    return asNumber;
  }

  const match = normalizedValue.match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error(
      `${configName} must be a positive number of seconds or use suffixes s, m, h, d.`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 's') {
    return amount;
  }

  if (unit === 'm') {
    return amount * 60;
  }

  if (unit === 'h') {
    return amount * 60 * 60;
  }

  return amount * 60 * 60 * 24;
};
