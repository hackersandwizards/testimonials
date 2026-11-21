const [GAMMA, CONTRAST, ROLL] = [0.97, 1.04, 0.5];

/**
 * Tone curve of the earlier hand runs: gamma, contrast around mid-grey, and above 0.75 a quadratic
 * segment that starts at slope 1.33 and flattens to 0.67 at white. Against the same curve without
 * that segment it lifts tones by up to 5 levels, and it clips inputs from 250 up to white.
 */
export function toneCurve(): number[] {
  return Array.from({ length: 256 }, (_, i) => {
    let x = 0.5 + ((i / 255) ** GAMMA - 0.5) * CONTRAST;
    if (x > 0.75) {
      const t = (x - 0.75) / 0.25;
      x = 0.75 + (0.25 * (t - ROLL * t * t * 0.5)) / (1 - ROLL * 0.5);
    }
    return Math.max(0, Math.min(255, Math.round(x * 255)));
  });
}

export function neutralGains(rgb: Uint8Array): [number, number, number] {
  const sum = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < rgb.length; i += 3) {
    const [r, g, b] = [rgb[i], rgb[i + 1], rgb[i + 2]];
    const hi = Math.max(r, g, b);
    if (hi - Math.min(r, g, b) < 0.08 * hi && hi > 40 && hi < 245) {
      sum[0] += r;
      sum[1] += g;
      sum[2] += b;
      n++;
    }
  }
  if (n === 0 || n < rgb.length / 3 / 100) return [1, 1, 1];
  const [red, green, blue] = sum;
  const grey = (red + green + blue) / 3;
  const gain = (channel: number) => Math.max(0.95, Math.min(1.05, grey / channel));
  return [gain(red), gain(green), gain(blue)];
}

/** Immerkær's fast noise estimate (1996) on the luminance of an RGB buffer. */
export function noiseSigma(rgb: Uint8Array, width: number, height: number): number {
  if (width < 3 || height < 3) return 0;
  const luma = new Float32Array(width * height);
  for (let i = 0; i < luma.length; i++) {
    luma[i] = 0.299 * rgb[i * 3] + 0.587 * rgb[i * 3 + 1] + 0.114 * rgb[i * 3 + 2];
  }
  const y = (x: number, row: number) => luma[row * width + x];
  let sum = 0;
  for (let row = 1; row < height - 1; row++) {
    for (let x = 1; x < width - 1; x++) {
      sum += Math.abs(
        y(x - 1, row - 1) -
          2 * y(x, row - 1) +
          y(x + 1, row - 1) -
          2 * (y(x - 1, row) - 2 * y(x, row) + y(x + 1, row)) +
          y(x - 1, row + 1) -
          2 * y(x, row + 1) +
          y(x + 1, row + 1),
      );
    }
  }
  return (Math.sqrt(Math.PI / 2) * sum) / (6 * (width - 2) * (height - 2));
}
