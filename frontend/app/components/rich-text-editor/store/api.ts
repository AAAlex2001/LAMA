export async function postAiEditTextStream(params: {
  apiBaseUrl: string;
  token: string;
  text: string;
  instruction: string;
}): Promise<Response> {
  const { apiBaseUrl, token, text, instruction } = params;

  return fetch(`${apiBaseUrl}/publications/ai/edit-text-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, instruction }),
  });
}
