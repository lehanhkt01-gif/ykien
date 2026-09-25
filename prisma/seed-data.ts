export interface AttachmentSeedType {
  name: string;
  url: string;
  size: number;
  type: string;
  ext?: string;
}

export interface InitialFeedbackType {
  ticketCode: string;
  voterName: string;
  phone?: string | null;
  village: string;
  category: string;
  content: string;
  status: string;
  createdAt: Date;
  ratingVerySatisfied?: number;
  ratingSatisfied?: number;
  ratingUnsatisfied?: number;
  attachments?: AttachmentSeedType[];
  response?: {
    answeringOrg: string;
    responseContent: string;
    documentUrl?: string | null;
    answeredBy: string;
    answeredAt: Date;
  };
}

export const initialFeedbacks: InitialFeedbackType[] = [];

