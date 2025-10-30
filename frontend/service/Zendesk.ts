// TODO: point to prod url.
const ZENDESK_API_URL = 'http://localhost:4200/api/zendesk';

type UploadFileParams = {
  fileName: string;
  fileContent: string;
  mimeType: string;
};

type UploadFileResponse =
  | {
      success: true;
      token: string;
    }
  | {
      success: false;
      error: string;
    };

type ZendeskUploadFileResponse = {
  upload: {
    token: string;
  };
};

// TODO: try catch to be used wisely. Currently using at both places
const uploadFile = async (
  file: UploadFileParams,
): Promise<UploadFileResponse> => {
  try {
    const { fileName, fileContent, mimeType } = file;
    const requestBody = {
      fileName,
      fileData: fileContent,
      contentType: mimeType,
    };
    const url = `${ZENDESK_API_URL}/upload-file`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const data: ZendeskUploadFileResponse = await response.json();
    const fileToken = data.upload.token;

    return { success: true, token: fileToken };
  } catch (error) {
    return { success: false, error: 'Failed to upload file' };
  }
};

type CreateTicketParams = {
  email?: string;
  subject: string;
  description: string;
  uploadTokens?: string[];
  tags?: string[];
  rating?: string;
};

type ZendeskCreateTicketResponse = {
  ticket: {
    id: number;
  };
};

type CreateTicketResponse =
  | {
      success: true;
      ticketId: number;
    }
  | {
      success: false;
      error: string;
    };

const createTicket = async (
  ticket: CreateTicketParams,
): Promise<CreateTicketResponse> => {
  try {
    const response = await fetch(`${ZENDESK_API_URL}/create-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket),
    });
    const data: ZendeskCreateTicketResponse = await response.json();
    const ticketId = data.ticket.id;
    return { success: true, ticketId };
  } catch (error) {
    return { success: false, error: 'Failed to create ticket' };
  }
};

export const ZendeskService = {
  uploadFile,
  createTicket,
};
