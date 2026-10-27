const STORAGE_KEY = 'cartnest:idempotency-details'

export function getIdempotencyKey(cart) {
  const fingerprint = getCartFingerprint(cart);

  try {
    const idempotencyDetails = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (idempotencyDetails?.['fingerprint'] === fingerprint) {
      return idempotencyDetails['idempotencyKey'];
    }
  } catch{
    //invalid stored data will be replaced below
  }

  const idempotencyKey = crypto.randomUUID();

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
    fingerprint,
    idempotencyKey
  }));

  return idempotencyKey;
}

//create a cart fingerprint to check if user has changed cart content before sending another request
//if no --> fetch key from storage
//if yes ---> generate a new key for the new cart
function getCartFingerprint(cart) {
  return JSON.stringify(
    cart
      .map(({ productId, quantity, deliveryOptionId }) => {
        return {
          productId,
          quantity,
          deliveryOptionId,
        };
      })
      .sort((left, right) => left.productId.localeCompare(right.productId))
  );
}

export function resetIdempotencyKey() {
  sessionStorage.removeItem(STORAGE_KEY);
}
