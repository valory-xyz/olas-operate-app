import { SUPPORT_API_URL } from '@/constants';
import { parseApiError } from '@/utils';

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

type SupportUploadFileResponse = {
  upload: {
    token: string;
  };
};

const UPLOAD_FILE_ERROR = 'Failed to upload file';

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
    const url = `${SUPPORT_API_URL}/upload-file`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      await parseApiError(response, UPLOAD_FILE_ERROR);
    }

    const data: SupportUploadFileResponse = await response.json();
    const fileToken = data.upload.token;

    return { success: true, token: fileToken };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : UPLOAD_FILE_ERROR,
    };
  }
};

export type SupportTicketTag = 'pearl' | 'support';

type CreateTicketParams = {
  email?: string;
  subject: string;
  description: string;
  uploadTokens?: string[];
  tags?: SupportTicketTag[];
};

type SupportCreateTicketResponse = {
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

const TICKET_CREATION_ERROR = 'Failed to create ticket';

const createTicket = async (
  ticket: CreateTicketParams,
): Promise<CreateTicketResponse> => {
  try {
    const response = await fetch(`${SUPPORT_API_URL}/create-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket),
    });

    if (!response.ok) {
      await parseApiError(response, TICKET_CREATION_ERROR);
    }

    const data: SupportCreateTicketResponse = await response.json();
    const ticketId = data.ticket.id;
    return { success: true, ticketId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : TICKET_CREATION_ERROR,
    };
  }
};

export const SupportService = {
  uploadFile,
  createTicket,
};
