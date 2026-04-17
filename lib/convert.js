export function convertUnit(qty, from, to) {
  if (!from || !to || from === to) return qty;
  
  const fromUnit = from.toLowerCase();
  const toUnit = to.toLowerCase();

  if (fromUnit === toUnit) return qty;

  // Conversion table (base unit: gram/ml mapping 1:1)
  // Everything is converted to a base value first, then converted to the target unit.
  // 1 gm = 1, 1 ml = 1
  // 1 kg = 1000, 1 ltr = 1000
  
  const conversionFactors = {
    gm: 1,
    ml: 1,
    kg: 1000,
    ltr: 1000,
    pcs: null, // pcs cannot be converted to mass/volume
    box: null
  };

  const fromFactor = conversionFactors[fromUnit];
  const toFactor = conversionFactors[toUnit];

  // If either unit is not in our mass/volume mapping (like 'pcs'), or they are incompatible, return as is.
  if (!fromFactor || !toFactor) {
    return qty;
  }

  // Convert to base (gm/ml), then divide by target factor
  const baseQty = qty * fromFactor;
  return baseQty / toFactor;
}
