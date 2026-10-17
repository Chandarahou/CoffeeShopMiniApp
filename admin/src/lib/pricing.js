// Price shown while building an order. Only an estimate: the server re-prices everything when the
// order is created, and its numbers are what end up on the order.
const asArray = (value) => [value ?? []].flat();

export function estimateUnitPrice(product, selections) {
  let price = product.price;
  for (const group of product.optionGroups ?? []) {
    const selected = asArray(selections[group.key]);
    for (const choice of group.choices) if (selected.includes(choice._id)) price += choice.priceDelta;
  }
  return price;
}

export function optionLabels(product, selections) {
  return (product.optionGroups ?? []).flatMap((group) => {
    const selected = asArray(selections[group.key]);
    return group.choices.filter((c) => selected.includes(c._id)).map((c) => c.label);
  });
}
