export function parseRetouchArgs({ crop, size }: { crop?: string; size?: string }) {
  let cropRect;
  if (crop !== undefined) {
    const fields = crop.split(",").map(Number);
    if (!/^\d+,\d+,[1-9]\d*$/.test(crop) || !fields.every(Number.isSafeInteger))
      throw new Error("--crop takes three whole numbers: left,top,size");
    const [left, top, side] = fields;
    cropRect = { left, top, size: side };
  }

  let outputSize;
  if (size !== undefined) {
    outputSize = Number(size);
    if (!/^[1-9]\d*$/.test(size) || !Number.isSafeInteger(outputSize))
      throw new Error("--size takes a whole number of pixels above 0");
  }
  return { crop: cropRect, size: outputSize };
}
