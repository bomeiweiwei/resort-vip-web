export type ItinerarySchedule = {
  time: string;
  title: string;
  content: string;
  preference: string;
  imageUrl?: string;
};

export type ItineraryDateGroup = {
  date: string;
  schedules: ItinerarySchedule[];
};

export type ItineraryFeedbackRequest = {
  message: string;
  date: string;
  lang: string
};

export type ItineraryFeedbackResponse = {
  success: boolean;
  message: string;
};