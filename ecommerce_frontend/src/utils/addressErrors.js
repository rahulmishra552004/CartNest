import axios from 'axios';

const SAVE_ERROR_MESSAGE = "We couldn't save this address. Please try again.";

//turns a failed request into one sentence the user can act on
export function getRequestErrorMessage(requestError, fallbackMessage) {
  if (!axios.isAxiosError(requestError)) {
    return fallbackMessage;
  }

  if (!requestError.response) {
    return "We couldn't reach the server. Check your connection and try again.";
  }

  //e.g. the 10 address limit, or "Authentication credentials were not provided."
  const detail = requestError.response.data?.detail;
  if (typeof detail === 'string' && detail) {
    return detail;
  }

  return fallbackMessage;
}

//turns a failed save into { message, fields } for the address forms.
//a 400 from /api/addresses/ maps field names (the same as the form's input names)
//to lists of messages, e.g. { phoneNumber: ['enter phone number with country code'] }
export function getFormError(requestError) {
  const response = axios.isAxiosError(requestError) ? requestError.response : undefined;
  const data = response?.data;
  const fields = {};

  if (response?.status === 400 && data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [name, messages] of Object.entries(data)) {
      if (name !== 'detail') {
        fields[name] = Array.isArray(messages) ? messages[0] : String(messages);
      }
    }
  }

  const message = Object.keys(fields).length > 0
    ? 'Please fix the highlighted fields.'
    : getRequestErrorMessage(requestError, SAVE_ERROR_MESSAGE);

  return { message, fields };
}
