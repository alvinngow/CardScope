type UpdateTransactionCategoryResponse = {
  category?: string;
  error?: string;
  id?: string;
};

export async function saveTransactionCategory(transactionId: string, category: string) {
  const response = await fetch(`/api/transactions/${transactionId}`, {
    body: JSON.stringify({ category }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
  const payload = (await response.json()) as UpdateTransactionCategoryResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "The category could not be saved.");
  }

  return {
    category: payload.category ?? category,
    id: payload.id ?? transactionId,
  };
}
